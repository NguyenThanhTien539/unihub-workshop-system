package com.unihub.application.registration;

import java.util.UUID;

public record RegistrationResult(
    UUID registrationId,
    UUID workshopId,
    UUID sessionId,
    String registrationStatus,
    boolean qrAvailable,
    UUID paymentIntentId,
    String paymentStatus,
    java.math.BigDecimal amount,
    String currency,
    java.time.LocalDateTime expiresAt) {
}
