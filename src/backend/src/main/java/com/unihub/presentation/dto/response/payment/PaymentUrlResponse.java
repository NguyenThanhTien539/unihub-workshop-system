package com.unihub.presentation.dto.response.payment;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record PaymentUrlResponse(
    UUID paymentIntentId,
    String paymentUrl,
    String provider,
    BigDecimal amount,
    String currency,
    LocalDateTime expiresAt) {
}
