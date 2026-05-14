package com.unihub.application.checkin;

import java.time.LocalDateTime;
import java.util.UUID;

public record CheckinSyncEventCommand(
    String syncEventId,
    UUID sessionId,
    String qrToken,
    LocalDateTime scannedAt,
    String deviceId) {
}
