package com.unihub.application.checkin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CheckinCommandServiceTest {
  @Mock private CheckinRepository checkinRepository;
  @Mock private QrTicketService qrTicketService;

  private CheckinCommandService service;
  private UUID userId;
  private UUID registrationId;
  private UUID sessionId;
  private LocalDateTime sessionStartAt;
  private LocalDateTime sessionEndAt;

  @BeforeEach
  void setUp() {
    service = new CheckinCommandService(
        checkinRepository,
        qrTicketService,
        Clock.fixed(Instant.parse("2026-06-10T08:30:00Z"), ZoneOffset.UTC));
    userId = UUID.randomUUID();
    registrationId = UUID.randomUUID();
    sessionId = UUID.randomUUID();
    sessionStartAt = LocalDateTime.of(2026, 6, 10, 8, 0);
    sessionEndAt = LocalDateTime.of(2026, 6, 10, 10, 0);
  }

  @Test
  void validateAcceptedCreatesOnlineCheckinRecord() {
    LocalDateTime scannedAt = LocalDateTime.of(2026, 6, 10, 8, 15);
    when(qrTicketService.verifyQrToken("valid-qr")).thenReturn(verifiedTicket("valid-qr", QrTicketStatus.ACTIVE));
    when(checkinRepository.findCandidateByRegistrationId(registrationId)).thenReturn(Optional.of(confirmedCandidate()));
    when(checkinRepository.findByRegistrationId(registrationId)).thenReturn(Optional.empty());

    CheckinValidationResult result = service.validate(
        userId,
        new ValidateCheckinCommand(sessionId, "valid-qr", scannedAt));

    assertEquals(CheckinResult.ACCEPTED, result.result());
    assertEquals(registrationId, result.registrationId());
    assertEquals("Student One", result.studentName());
    assertEquals("23123456", result.studentId());
    assertEquals(scannedAt, result.checkedInAt());
    assertNull(result.previousCheckedInAt());
    verify(checkinRepository).save(any(CheckinRecord.class));
  }

  @Test
  void validateDuplicateReturnsExistingCheckinWithoutInsertingAnotherRow() {
    LocalDateTime previousCheckedInAt = LocalDateTime.of(2026, 6, 10, 8, 5);
    when(qrTicketService.verifyQrToken("valid-qr")).thenReturn(verifiedTicket("valid-qr", QrTicketStatus.ACTIVE));
    when(checkinRepository.findCandidateByRegistrationId(registrationId)).thenReturn(Optional.of(confirmedCandidate()));
    when(checkinRepository.findByRegistrationId(registrationId)).thenReturn(Optional.of(existingCheckin(previousCheckedInAt)));

    CheckinValidationResult result = service.validate(
        userId,
        new ValidateCheckinCommand(sessionId, "valid-qr", LocalDateTime.of(2026, 6, 10, 8, 20)));

    assertEquals(CheckinResult.DUPLICATE, result.result());
    assertEquals(previousCheckedInAt, result.previousCheckedInAt());
    verify(checkinRepository, never()).save(any(CheckinRecord.class));
  }

  @Test
  void syncProcessesMixedBatchIndependently() {
    String existingSyncEventId = "sync-001";
    String acceptedSyncEventId = "sync-003";
    UUID syncedRegistrationId = UUID.randomUUID();
    UUID acceptedRegistrationId = UUID.randomUUID();
    UUID acceptedSessionId = UUID.randomUUID();
    LocalDateTime syncedAt = LocalDateTime.of(2026, 6, 10, 8, 10);
    LocalDateTime acceptedAt = LocalDateTime.of(2026, 6, 10, 8, 25);

    when(checkinRepository.findBySyncEventId(existingSyncEventId))
        .thenReturn(Optional.of(new CheckinRecord(
            UUID.randomUUID(),
            syncedRegistrationId,
            sessionId,
            userId,
            existingSyncEventId,
            CheckinSourceMode.OFFLINE_SYNC,
            syncedAt,
            syncedAt,
            syncedAt)));
    when(checkinRepository.findCandidateByRegistrationId(syncedRegistrationId))
        .thenReturn(Optional.of(new CheckinCandidate(
            syncedRegistrationId,
            RegistrationStatus.CONFIRMED,
            sessionId,
            WorkshopStatus.PUBLISHED,
            WorkshopSessionStatus.OPEN,
            sessionStartAt,
            sessionEndAt,
            "Student Synced",
            "20000001")));

    when(checkinRepository.findBySyncEventId("sync-002")).thenReturn(Optional.empty());
    when(qrTicketService.verifyQrToken("bad-qr")).thenThrow(new QrTokenVerificationException("invalid"));

    when(checkinRepository.findBySyncEventId(acceptedSyncEventId)).thenReturn(Optional.empty());
    when(qrTicketService.verifyQrToken("good-qr")).thenReturn(verifiedTicket(
        "good-qr",
        QrTicketStatus.ACTIVE,
        acceptedRegistrationId,
        acceptedSessionId));
    when(checkinRepository.findCandidateByRegistrationId(acceptedRegistrationId))
        .thenReturn(Optional.of(new CheckinCandidate(
            acceptedRegistrationId,
            RegistrationStatus.CONFIRMED,
            acceptedSessionId,
            WorkshopStatus.PUBLISHED,
            WorkshopSessionStatus.OPEN,
            sessionStartAt,
            sessionEndAt,
            "Student Accepted",
            "20000002")));
    when(checkinRepository.findByRegistrationId(acceptedRegistrationId)).thenReturn(Optional.empty());

    CheckinSyncResult result = service.sync(userId, new SyncCheckinCommand(List.of(
        new CheckinSyncEventCommand(existingSyncEventId, sessionId, "ignored", syncedAt, "device-1"),
        new CheckinSyncEventCommand("sync-002", sessionId, "bad-qr", syncedAt, "device-1"),
        new CheckinSyncEventCommand(acceptedSyncEventId, acceptedSessionId, "good-qr", acceptedAt, "device-2"))));

    assertEquals(3, result.results().size());
    assertEquals(CheckinResult.ALREADY_SYNCED, result.results().get(0).result());
    assertEquals("20000001", result.results().get(0).studentId());
    assertEquals(CheckinErrorCode.CHECKIN_EVENT_ALREADY_SYNCED.code(), result.results().get(0).errorCode());

    assertEquals(CheckinResult.REJECTED, result.results().get(1).result());
    assertEquals(CheckinErrorCode.CHECKIN_INVALID_QR.code(), result.results().get(1).errorCode());

    assertEquals(CheckinResult.ACCEPTED, result.results().get(2).result());
    assertEquals(acceptedRegistrationId, result.results().get(2).registrationId());
    assertEquals("20000002", result.results().get(2).studentId());
    assertEquals(acceptedAt, result.results().get(2).checkedInAt());
    verify(checkinRepository).save(any(CheckinRecord.class));
  }

  private CheckinCandidate confirmedCandidate() {
    return new CheckinCandidate(
        registrationId,
        RegistrationStatus.CONFIRMED,
        sessionId,
        WorkshopStatus.PUBLISHED,
        WorkshopSessionStatus.OPEN,
        sessionStartAt,
        sessionEndAt,
        "Student One",
        "23123456");
  }

  private CheckinRecord existingCheckin(LocalDateTime scannedAt) {
    return new CheckinRecord(
        UUID.randomUUID(),
        registrationId,
        sessionId,
        userId,
        null,
        CheckinSourceMode.ONLINE,
        scannedAt,
        scannedAt,
        scannedAt);
  }

  private VerifiedQrTicket verifiedTicket(String payload, QrTicketStatus status) {
    return verifiedTicket(payload, status, registrationId, sessionId);
  }

  private VerifiedQrTicket verifiedTicket(
      String payload,
      QrTicketStatus status,
      UUID registrationId,
      UUID sessionId) {
    LocalDateTime issuedAt = LocalDateTime.of(2026, 6, 1, 8, 0);
    return new VerifiedQrTicket(
        new QrTicket(
            UUID.nameUUIDFromBytes(payload.getBytes()),
            registrationId,
            "hash-" + payload,
            status,
            issuedAt,
            LocalDateTime.of(2026, 6, 15, 8, 0),
            null,
            issuedAt),
        new com.unihub.application.qr.QrTokenClaims(
            "unihub",
            UUID.nameUUIDFromBytes(payload.getBytes()),
            registrationId,
            issuedAt,
            LocalDateTime.of(2026, 6, 15, 8, 0)));
  }
}
