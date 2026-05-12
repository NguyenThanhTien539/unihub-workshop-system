package com.unihub.presentation.dto.response.payment;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record PaymentStatusResponse(
    UUID paymentIntentId,
    UUID registrationId,
    String paymentStatus,
    String registrationStatus,
    BigDecimal amount,
    String currency,
    String provider,
    String providerTransactionId,
    LocalDateTime expiresAt,
    boolean qrAvailable) {
}
