package com.unihub.application.qr;

import java.time.LocalDateTime;
import java.util.UUID;

public record QrTicketData(
    UUID qrTicketId,
    String payload,
    String dataUrl,
    LocalDateTime expiresAt,
    String status) {
}
