package com.unihub.application.checkin;

import java.time.LocalDateTime;
import java.util.UUID;

public record ValidateCheckinCommand(
    UUID sessionId,
    String qrToken,
    LocalDateTime scannedAt) {
}
