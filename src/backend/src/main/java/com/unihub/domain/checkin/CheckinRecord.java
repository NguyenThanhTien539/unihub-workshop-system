package com.unihub.domain.checkin;

import java.time.LocalDateTime;
import java.util.UUID;

public record CheckinRecord(
    UUID id,
    UUID registrationId,
    UUID sessionId,
    UUID scannedByUserId,
    String syncEventId,
    CheckinSourceMode sourceMode,
    LocalDateTime scannedAt,
    LocalDateTime serverReceivedAt,
    LocalDateTime createdAt) {
}
