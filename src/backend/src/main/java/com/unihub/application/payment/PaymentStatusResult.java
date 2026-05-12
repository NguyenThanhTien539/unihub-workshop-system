package com.unihub.application.payment;

import java.time.LocalDateTime;
import java.util.UUID;

public record PaymentStatusResult(
    UUID paymentIntentId,
    UUID registrationId,
    String paymentStatus,
    String registrationStatus,
    java.math.BigDecimal amount,
    String currency,
    String provider,
    String providerTransactionId,
    LocalDateTime expiresAt,
    boolean qrAvailable) {
}
