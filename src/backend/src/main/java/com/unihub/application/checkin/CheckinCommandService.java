package com.unihub.application.checkin;

import com.unihub.application.qr.QrTicketService;
import com.unihub.application.qr.QrTokenVerificationException;
import com.unihub.application.qr.VerifiedQrTicket;
import com.unihub.domain.checkin.CheckinCandidate;
import com.unihub.domain.checkin.CheckinRecord;
import com.unihub.domain.checkin.CheckinRepository;
import com.unihub.domain.checkin.CheckinResult;
import com.unihub.domain.checkin.CheckinSourceMode;
import com.unihub.domain.qr.QrTicket;
import com.unihub.domain.qr.QrTicketStatus;
import com.unihub.domain.registration.RegistrationStatus;
import com.unihub.domain.workshop.WorkshopSessionStatus;
import com.unihub.domain.workshop.WorkshopStatus;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class CheckinCommandService {
  private final CheckinRepository checkinRepository;
  private final QrTicketService qrTicketService;
  private final Clock clock;

  public CheckinCommandService(
      CheckinRepository checkinRepository,
      QrTicketService qrTicketService,
      Clock clock) {
    this.checkinRepository = checkinRepository;
    this.qrTicketService = qrTicketService;
    this.clock = clock;
  }

  public CheckinValidationResult validate(UUID scannedByUserId, ValidateCheckinCommand command) {
    CheckinProcessingResult result = processEvent(
        scannedByUserId,
        command.sessionId(),
        command.qrToken(),
        command.scannedAt(),
        CheckinSourceMode.ONLINE,
        null);
    return new CheckinValidationResult(
        result.result(),
        result.registrationId(),
        result.studentName(),
        result.studentId(),
        result.checkedInAt(),
        result.previousCheckedInAt());
  }

  public CheckinSyncResult sync(UUID scannedByUserId, SyncCheckinCommand command) {
    List<CheckinSyncItemResult> results = new ArrayList<>();
    for (CheckinSyncEventCommand event : command.events()) {
      results.add(processSyncEvent(scannedByUserId, event));
    }
    return new CheckinSyncResult(List.copyOf(results));
  }

  private CheckinSyncItemResult processSyncEvent(UUID scannedByUserId, CheckinSyncEventCommand event) {
    CheckinRecord existing = checkinRepository.findBySyncEventId(event.syncEventId()).orElse(null);
    if (existing != null) {
      CheckinCandidate candidate = checkinRepository.findCandidateByRegistrationId(existing.registrationId())
          .orElse(null);
      return new CheckinSyncItemResult(
          event.syncEventId(),
          CheckinResult.ALREADY_SYNCED,
          existing.registrationId(),
          candidate == null ? null : candidate.studentCode(),
          existing.scannedAt(),
          CheckinErrorCode.CHECKIN_EVENT_ALREADY_SYNCED.code());
    }

    try {
      CheckinProcessingResult result = processEvent(
          scannedByUserId,
          event.sessionId(),
          event.qrToken(),
          event.scannedAt(),
          CheckinSourceMode.OFFLINE_SYNC,
          event.syncEventId());
      return new CheckinSyncItemResult(
          event.syncEventId(),
          result.result(),
          result.registrationId(),
          result.studentId(),
          result.result() == CheckinResult.ACCEPTED ? result.checkedInAt() : result.previousCheckedInAt(),
          result.errorCode());
    } catch (CheckinException ex) {
      return new CheckinSyncItemResult(
          event.syncEventId(),
          CheckinResult.REJECTED,
          null,
          null,
          null,
          ex.getErrorCode().code());
    }
  }

  private CheckinProcessingResult processEvent(
      UUID scannedByUserId,
      UUID requestedSessionId,
      String qrToken,
      LocalDateTime scannedAt,
      CheckinSourceMode sourceMode,
      String syncEventId) {
    VerifiedQrTicket verifiedQrTicket = verifyQrToken(qrToken);
    QrTicket qrTicket = verifiedQrTicket.qrTicket();
    CheckinCandidate candidate = checkinRepository.findCandidateByRegistrationId(qrTicket.registrationId())
        .orElseThrow(() -> new CheckinException(CheckinErrorCode.CHECKIN_REGISTRATION_NOT_FOUND, HttpStatus.NOT_FOUND));

    validateCandidate(candidate, qrTicket, requestedSessionId, scannedAt);

    CheckinRecord existingCheckin = checkinRepository.findByRegistrationId(candidate.registrationId()).orElse(null);
    if (existingCheckin != null) {
      return duplicate(candidate, existingCheckin);
    }

    LocalDateTime now = LocalDateTime.now(clock);
    CheckinRecord checkinRecord = new CheckinRecord(
        UUID.randomUUID(),
        candidate.registrationId(),
        candidate.sessionId(),
        scannedByUserId,
        syncEventId,
        sourceMode,
        scannedAt,
        now,
        now);

    try {
      checkinRepository.save(checkinRecord);
    } catch (DataIntegrityViolationException ex) {
      CheckinProcessingResult resolved = resolveConcurrentWrite(candidate.registrationId(), syncEventId);
      if (resolved != null) {
        return resolved;
      }
      throw new CheckinException(CheckinErrorCode.CHECKIN_RECORD_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return new CheckinProcessingResult(
        CheckinResult.ACCEPTED,
        candidate.registrationId(),
        candidate.studentName(),
        candidate.studentCode(),
        scannedAt,
        null,
        null);
  }

  private VerifiedQrTicket verifyQrToken(String qrToken) {
    try {
      return qrTicketService.verifyQrToken(qrToken);
    } catch (QrTokenVerificationException ex) {
      throw new CheckinException(CheckinErrorCode.CHECKIN_INVALID_QR, HttpStatus.BAD_REQUEST);
    } catch (IllegalStateException ex) {
      throw new CheckinException(CheckinErrorCode.CHECKIN_QR_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
  }

  private void validateCandidate(
      CheckinCandidate candidate,
      QrTicket qrTicket,
      UUID requestedSessionId,
      LocalDateTime scannedAt) {
    if (qrTicket.status() == QrTicketStatus.REVOKED) {
      throw new CheckinException(CheckinErrorCode.CHECKIN_QR_REVOKED, HttpStatus.CONFLICT);
    }
    if (qrTicket.status() == QrTicketStatus.EXPIRED
        || (qrTicket.expiresAt() != null && scannedAt.isAfter(qrTicket.expiresAt()))) {
      throw new CheckinException(CheckinErrorCode.CHECKIN_QR_EXPIRED, HttpStatus.CONFLICT);
    }
    if (candidate.registrationStatus() != RegistrationStatus.CONFIRMED) {
      throw new CheckinException(CheckinErrorCode.CHECKIN_REGISTRATION_NOT_CONFIRMED, HttpStatus.CONFLICT);
    }
    if (requestedSessionId != null && !candidate.sessionId().equals(requestedSessionId)) {
      throw new CheckinException(CheckinErrorCode.CHECKIN_SESSION_MISMATCH, HttpStatus.CONFLICT);
    }
    if (!isSessionOpenForCheckin(candidate.workshopStatus(), candidate.sessionStatus(),
        candidate.sessionStartAt(), candidate.sessionEndAt(), scannedAt)) {
      throw new CheckinException(CheckinErrorCode.CHECKIN_SESSION_NOT_OPEN, HttpStatus.CONFLICT);
    }
  }

  private boolean isSessionOpenForCheckin(
      WorkshopStatus workshopStatus,
      WorkshopSessionStatus sessionStatus,
      LocalDateTime startAt,
      LocalDateTime endAt,
      LocalDateTime eventTime) {
    if (workshopStatus != WorkshopStatus.PUBLISHED) {
      return false;
    }
    boolean allowedStatus = sessionStatus == WorkshopSessionStatus.OPEN || sessionStatus == WorkshopSessionStatus.FULL;
    return allowedStatus && !eventTime.isBefore(startAt) && !eventTime.isAfter(endAt);
  }

  private CheckinProcessingResult resolveConcurrentWrite(UUID registrationId, String syncEventId) {
    if (syncEventId != null) {
      CheckinRecord existingSync = checkinRepository.findBySyncEventId(syncEventId).orElse(null);
      if (existingSync != null) {
        CheckinCandidate candidate = checkinRepository.findCandidateByRegistrationId(existingSync.registrationId())
            .orElse(null);
        return new CheckinProcessingResult(
            CheckinResult.ALREADY_SYNCED,
            existingSync.registrationId(),
            candidate == null ? null : candidate.studentName(),
            candidate == null ? null : candidate.studentCode(),
            existingSync.scannedAt(),
            null,
            CheckinErrorCode.CHECKIN_EVENT_ALREADY_SYNCED.code());
      }
    }

    CheckinRecord existingCheckin = checkinRepository.findByRegistrationId(registrationId).orElse(null);
    if (existingCheckin == null) {
      return null;
    }
    CheckinCandidate candidate = checkinRepository.findCandidateByRegistrationId(registrationId).orElse(null);
    if (candidate == null) {
      return null;
    }
    return duplicate(candidate, existingCheckin);
  }

  private CheckinProcessingResult duplicate(CheckinCandidate candidate, CheckinRecord existingCheckin) {
    return new CheckinProcessingResult(
        CheckinResult.DUPLICATE,
        candidate.registrationId(),
        candidate.studentName(),
        candidate.studentCode(),
        null,
        existingCheckin.scannedAt(),
        CheckinErrorCode.CHECKIN_DUPLICATE.code());
  }

  private record CheckinProcessingResult(
      CheckinResult result,
      UUID registrationId,
      String studentName,
      String studentId,
      LocalDateTime checkedInAt,
      LocalDateTime previousCheckedInAt,
      String errorCode) {
  }
}
