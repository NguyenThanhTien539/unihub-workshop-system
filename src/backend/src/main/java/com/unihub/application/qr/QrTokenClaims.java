package com.unihub.application.qr;

import java.time.LocalDateTime;
import java.util.UUID;

public record QrTokenClaims(
    String issuer,
    UUID ticketId,
    UUID registrationId,
    LocalDateTime issuedAt,
    LocalDateTime expiresAt) {
}
