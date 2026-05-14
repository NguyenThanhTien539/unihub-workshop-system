package com.unihub.infrastructure.persistence.checkin;

import com.unihub.domain.checkin.CheckinRecord;
import com.unihub.domain.checkin.CheckinSourceMode;
import java.time.LocalDateTime;
import java.util.UUID;

public record CheckinRecordEntity(
    UUID id,
    UUID registrationId,
    UUID sessionId,
    UUID scannedByUserId,
    String syncEventId,
    String sourceMode,
    LocalDateTime scannedAt,
    LocalDateTime serverReceivedAt,
    LocalDateTime createdAt) {
  CheckinRecord toDomain() {
    return new CheckinRecord(
        id,
        registrationId,
        sessionId,
        scannedByUserId,
        syncEventId,
        CheckinSourceMode.valueOf(sourceMode),
        scannedAt,
        serverReceivedAt,
        createdAt);
  }
}
