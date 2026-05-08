package com.unihub.domain.payment;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record PaymentIntent(
    UUID id,
    UUID registrationId,
    String idempotencyKey,
    String gatewayRef,
    PaymentStatus status,
    BigDecimal amount,
    String currency,
    String paymentUrl,
    LocalDateTime expiresAt,
    LocalDateTime paidAt,
    String failureReason,
    LocalDateTime createdAt,
    LocalDateTime updatedAt) {
}
