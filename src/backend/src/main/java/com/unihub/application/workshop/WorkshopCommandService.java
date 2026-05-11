package com.unihub.application.workshop;

import com.unihub.application.workshop.exception.WorkshopException;
import com.unihub.domain.room.Room;
import com.unihub.domain.room.RoomRepository;
import com.unihub.domain.room.RoomStatus;
import com.unihub.domain.workshop.FeeType;
import com.unihub.domain.workshop.Workshop;
import com.unihub.domain.workshop.WorkshopErrorCode;
import com.unihub.domain.workshop.WorkshopRepository;
import com.unihub.domain.workshop.WorkshopSession;
import com.unihub.domain.workshop.WorkshopSessionStatus;
import com.unihub.domain.workshop.WorkshopStatus;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkshopCommandService {
  private final WorkshopRepository workshopRepository;
  private final RoomRepository roomRepository;
  private final Clock clock;

  public WorkshopCommandService(
      WorkshopRepository workshopRepository,
      RoomRepository roomRepository,
      Clock clock) {
    this.workshopRepository = workshopRepository;
    this.roomRepository = roomRepository;
    this.clock = clock;
  }

  @Transactional
  public Workshop createWorkshop(CreateWorkshopCommand command) {
    validateRequiredText(command.title(), "title");
    validateRequiredText(command.speaker(), "speaker");
    validateRequiredText(command.description(), "description");

    LocalDateTime now = LocalDateTime.now(clock);
    Workshop workshop = new Workshop(
        UUID.randomUUID(),
        command.title().trim(),
        command.speaker().trim(),
        command.description().trim(),
        WorkshopStatus.DRAFT,
        command.createdByUserId(),
        now,
        now,
        null,
        null);

    workshopRepository.save(workshop);

    if (command.sessions() != null && !command.sessions().isEmpty()) {
      for (CreateSessionCommand sessionCommand : command.sessions()) {
        CreateSessionCommand enriched = new CreateSessionCommand(
            workshop.id(),
            sessionCommand.roomId(),
            sessionCommand.startAt(),
            sessionCommand.endAt(),
            sessionCommand.seatCapacity(),
            sessionCommand.feeType(),
            sessionCommand.feeAmount(),
            sessionCommand.currency());
        createSession(enriched);
      }
    }

    return workshop;
  }

  @Transactional
  public Workshop updateWorkshop(UpdateWorkshopCommand command) {
    Workshop workshop = requireWorkshop(command.workshopId());
    if (workshop.status() == WorkshopStatus.CANCELED || workshop.status() == WorkshopStatus.ARCHIVED) {
      throw new WorkshopException(WorkshopErrorCode.WORKSHOP_VALIDATION_ERROR, HttpStatus.CONFLICT,
          "Workshop cannot be updated in its current state");
    }

    validateOptionalText(command.title(), "title");
    validateOptionalText(command.speaker(), "speaker");
    validateOptionalText(command.description(), "description");

    LocalDateTime now = LocalDateTime.now(clock);
    Workshop updated = new Workshop(
        workshop.id(),
        command.title() == null ? workshop.title() : command.title().trim(),
        command.speaker() == null ? workshop.speaker() : command.speaker().trim(),
        command.description() == null ? workshop.description() : command.description().trim(),
        workshop.status(),
        workshop.createdByUserId(),
        workshop.createdAt(),
        now,
        workshop.publishedAt(),
        workshop.canceledAt());

    workshopRepository.update(updated);
    return updated;
  }

  @Transactional
  public Workshop publishWorkshop(UUID workshopId) {
    Workshop workshop = requireWorkshop(workshopId);
    if (workshop.status() != WorkshopStatus.DRAFT) {
      throw new WorkshopException(WorkshopErrorCode.WORKSHOP_VALIDATION_ERROR, HttpStatus.CONFLICT,
          "Workshop cannot be published in its current state");
    }

    List<WorkshopSession> sessions = workshopRepository.findSessionsByWorkshopId(workshopId);
    if (!hasValidPublishableSession(sessions)) {
      throw new WorkshopException(WorkshopErrorCode.WORKSHOP_VALIDATION_ERROR, HttpStatus.CONFLICT,
          "Workshop must have at least one valid session");
    }

    LocalDateTime now = LocalDateTime.now(clock);
    workshopRepository.updateWorkshopStatus(workshopId, WorkshopStatus.PUBLISHED, now, null);

    return new Workshop(
        workshop.id(),
        workshop.title(),
        workshop.speaker(),
        workshop.description(),
        WorkshopStatus.PUBLISHED,
        workshop.createdByUserId(),
        workshop.createdAt(),
        now,
        now,
        workshop.canceledAt());
  }

  @Transactional
  public Workshop cancelWorkshop(UUID workshopId) {
    Workshop workshop = requireWorkshop(workshopId);
    if (workshop.status() == WorkshopStatus.CANCELED) {
      throw new WorkshopException(WorkshopErrorCode.WORKSHOP_VALIDATION_ERROR, HttpStatus.CONFLICT,
          "Workshop has already been cancelled");
    }
    if (workshop.status() == WorkshopStatus.ARCHIVED) {
      throw new WorkshopException(WorkshopErrorCode.WORKSHOP_VALIDATION_ERROR, HttpStatus.CONFLICT,
          "Archived workshop cannot be cancelled");
    }

    LocalDateTime now = LocalDateTime.now(clock);
    workshopRepository.updateWorkshopStatus(workshopId, WorkshopStatus.CANCELED, workshop.publishedAt(), now);
    workshopRepository.cancelSessionsByWorkshopId(workshopId, now);

    return new Workshop(
        workshop.id(),
        workshop.title(),
        workshop.speaker(),
        workshop.description(),
        WorkshopStatus.CANCELED,
        workshop.createdByUserId(),
        workshop.createdAt(),
        now,
        workshop.publishedAt(),
        now);
  }

  @Transactional
  public WorkshopSession createSession(CreateSessionCommand command) {
    Workshop workshop = requireWorkshop(command.workshopId());
    if (workshop.status() == WorkshopStatus.CANCELED || workshop.status() == WorkshopStatus.ARCHIVED) {
      throw new WorkshopException(WorkshopErrorCode.WORKSHOP_VALIDATION_ERROR, HttpStatus.CONFLICT,
          "Workshop cannot accept new sessions in its current state");
    }

    Room room = requireActiveRoom(command.roomId());
    validateTimeRange(command.startAt(), command.endAt());
    validateCapacity(command.seatCapacity());
    ensureRoomCapacity(room, command.seatCapacity());

    BigDecimal feeAmount = normalizeFee(command.feeType(), command.feeAmount());
    String currency = normalizeCurrency(command.currency());

    if (workshopRepository.existsRoomConflict(room.id(), command.startAt(), command.endAt(), null)) {
      throw new WorkshopException(WorkshopErrorCode.WORKSHOP_ROOM_CONFLICT, HttpStatus.CONFLICT);
    }

    LocalDateTime now = LocalDateTime.now(clock);
    WorkshopSession session = new WorkshopSession(
        UUID.randomUUID(),
        workshop.id(),
        room.id(),
        command.startAt(),
        command.endAt(),
        WorkshopSessionStatus.OPEN,
        command.seatCapacity(),
        0,
        0,
        command.feeType(),
        feeAmount,
        currency,
        now,
        now,
        null);

    workshopRepository.saveSession(session);
    return session;
  }

  @Transactional
  public WorkshopSession updateSession(UpdateSessionCommand command) {
    WorkshopSession session = requireSession(command.sessionId());
    if (session.status() == WorkshopSessionStatus.CANCELED) {
      throw new WorkshopException(WorkshopErrorCode.WORKSHOP_VALIDATION_ERROR, HttpStatus.CONFLICT,
          "Session is canceled");
    }

    UUID newRoomId = command.roomId() == null ? session.roomId() : command.roomId();
    Room room = requireActiveRoom(newRoomId);

    LocalDateTime newStartAt = command.startAt() == null ? session.startAt() : command.startAt();
    LocalDateTime newEndAt = command.endAt() == null ? session.endAt() : command.endAt();
    validateTimeRange(newStartAt, newEndAt);

    int newCapacity = command.seatCapacity() == null ? session.seatCapacity() : command.seatCapacity();
    validateCapacity(newCapacity);
    ensureRoomCapacity(room, newCapacity);

    int usedSeats = session.seatsConfirmed() + session.seatsReserved();
    if (newCapacity < usedSeats) {
      throw new WorkshopException(WorkshopErrorCode.WORKSHOP_CAPACITY_BELOW_CONFIRMED, HttpStatus.CONFLICT);
    }

    FeeType feeType = command.feeType() == null ? session.feeType() : command.feeType();
    BigDecimal feeAmount = command.feeAmount() == null ? session.feeAmount() : command.feeAmount();
    feeAmount = normalizeFee(feeType, feeAmount);

    String currency = command.currency() == null ? session.currency() : command.currency();
    currency = normalizeCurrency(currency);

    boolean scheduleChanged = !newRoomId.equals(session.roomId())
        || !newStartAt.equals(session.startAt())
        || !newEndAt.equals(session.endAt());

    if (scheduleChanged && workshopRepository.existsRoomConflict(newRoomId, newStartAt, newEndAt, session.id())) {
      throw new WorkshopException(WorkshopErrorCode.WORKSHOP_ROOM_CONFLICT, HttpStatus.CONFLICT);
    }

    LocalDateTime now = LocalDateTime.now(clock);
    WorkshopSession updated = new WorkshopSession(
        session.id(),
        session.workshopId(),
        newRoomId,
        newStartAt,
        newEndAt,
        session.status(),
        newCapacity,
        session.seatsConfirmed(),
        session.seatsReserved(),
        feeType,
        feeAmount,
        currency,
        session.createdAt(),
        now,
        session.canceledAt());

    workshopRepository.updateSession(updated);
    return updated;
  }

  @Transactional
  public WorkshopSession cancelSession(UUID sessionId) {
    WorkshopSession session = requireSession(sessionId);
    if (session.status() == WorkshopSessionStatus.CANCELED) {
      return session;
    }

    LocalDateTime now = LocalDateTime.now(clock);
    WorkshopSession canceled = new WorkshopSession(
        session.id(),
        session.workshopId(),
        session.roomId(),
        session.startAt(),
        session.endAt(),
        WorkshopSessionStatus.CANCELED,
        session.seatCapacity(),
        session.seatsConfirmed(),
        session.seatsReserved(),
        session.feeType(),
        session.feeAmount(),
        session.currency(),
        session.createdAt(),
        now,
        now);

    workshopRepository.updateSession(canceled);
    return canceled;
  }

  private Workshop requireWorkshop(UUID workshopId) {
    return workshopRepository.findById(workshopId)
        .orElseThrow(() -> new WorkshopException(WorkshopErrorCode.WORKSHOP_NOT_FOUND, HttpStatus.NOT_FOUND));
  }

  private WorkshopSession requireSession(UUID sessionId) {
    return workshopRepository.findSessionById(sessionId)
        .orElseThrow(() -> new WorkshopException(WorkshopErrorCode.WORKSHOP_SESSION_NOT_FOUND, HttpStatus.NOT_FOUND));
  }

  private Room requireActiveRoom(UUID roomId) {
    Room room = roomRepository.findById(roomId)
        .orElseThrow(() -> new WorkshopException(WorkshopErrorCode.WORKSHOP_ROOM_NOT_FOUND, HttpStatus.NOT_FOUND));
    if (room.status() != RoomStatus.ACTIVE) {
      throw new WorkshopException(WorkshopErrorCode.WORKSHOP_VALIDATION_ERROR, HttpStatus.CONFLICT,
          "Room is inactive");
    }
    return room;
  }

  private void validateRequiredText(String value, String field) {
    if (value == null || value.isBlank()) {
      throw new WorkshopException(WorkshopErrorCode.WORKSHOP_VALIDATION_ERROR, HttpStatus.BAD_REQUEST,
          field + " is required");
    }
  }

  private void validateOptionalText(String value, String field) {
    if (value != null && value.isBlank()) {
      throw new WorkshopException(WorkshopErrorCode.WORKSHOP_VALIDATION_ERROR, HttpStatus.BAD_REQUEST,
          field + " must not be blank");
    }
  }

  private void validateTimeRange(LocalDateTime startAt, LocalDateTime endAt) {
    if (startAt == null || endAt == null || !endAt.isAfter(startAt)) {
      throw new WorkshopException(WorkshopErrorCode.WORKSHOP_INVALID_TIME_RANGE, HttpStatus.BAD_REQUEST);
    }
  }

  private void validateCapacity(int seatCapacity) {
    if (seatCapacity <= 0) {
      throw new WorkshopException(WorkshopErrorCode.WORKSHOP_INVALID_CAPACITY, HttpStatus.BAD_REQUEST);
    }
  }

  private void ensureRoomCapacity(Room room, int seatCapacity) {
    if (seatCapacity > room.capacity()) {
      throw new WorkshopException(WorkshopErrorCode.WORKSHOP_ROOM_CAPACITY_EXCEEDED, HttpStatus.CONFLICT);
    }
  }

  private BigDecimal normalizeFee(FeeType feeType, BigDecimal feeAmount) {
    if (feeType == null) {
      throw new WorkshopException(WorkshopErrorCode.WORKSHOP_VALIDATION_ERROR, HttpStatus.BAD_REQUEST,
          "feeType is required");
    }

    if (feeType == FeeType.FREE) {
      if (feeAmount != null && feeAmount.compareTo(BigDecimal.ZERO) > 0) {
        throw new WorkshopException(WorkshopErrorCode.WORKSHOP_FEE_NOT_ALLOWED, HttpStatus.BAD_REQUEST);
      }
      return BigDecimal.ZERO;
    }

    if (feeAmount == null || feeAmount.compareTo(BigDecimal.ZERO) <= 0) {
      throw new WorkshopException(WorkshopErrorCode.WORKSHOP_FEE_REQUIRED, HttpStatus.BAD_REQUEST);
    }
    return feeAmount;
  }

  private String normalizeCurrency(String currency) {
    if (currency == null || currency.isBlank()) {
      return "VND";
    }
    return currency.trim();
  }

  private boolean hasValidPublishableSession(List<WorkshopSession> sessions) {
    if (sessions == null) {
      return false;
    }

    for (WorkshopSession session : sessions) {
      if (session.status() == WorkshopSessionStatus.CANCELED) {
        continue;
      }
      if (session.startAt() == null || session.endAt() == null || !session.endAt().isAfter(session.startAt())) {
        continue;
      }
      if (session.seatCapacity() <= 0) {
        continue;
      }
      if (!isFeeValid(session.feeType(), session.feeAmount())) {
        continue;
      }
      Room room = roomRepository.findById(session.roomId()).orElse(null);
      if (room == null || room.status() != RoomStatus.ACTIVE) {
        continue;
      }
      if (session.seatCapacity() > room.capacity()) {
        continue;
      }
      return true;
    }

    return false;
  }

  private boolean isFeeValid(FeeType feeType, BigDecimal feeAmount) {
    if (feeType == null) {
      return false;
    }
    if (feeType == FeeType.FREE) {
      return feeAmount == null || feeAmount.compareTo(BigDecimal.ZERO) == 0;
    }
    return feeAmount != null && feeAmount.compareTo(BigDecimal.ZERO) > 0;
  }
}
