package com.unihub.domain.qr;

import java.time.LocalDateTime;
import java.util.UUID;

public record QrTicket(
    UUID id,
    UUID registrationId,
    String qrTokenHash,
    QrTicketStatus status,
    LocalDateTime issuedAt,
    LocalDateTime expiresAt,
    LocalDateTime revokedAt,
    LocalDateTime createdAt) {
}
