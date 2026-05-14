package com.unihub.presentation.dto.response.payment;

import java.time.LocalDateTime;
import java.util.UUID;

public record PaymentUrlResponse(
    UUID paymentIntentId,
    String provider,
    String paymentUrl,
    String appTransId,
    String status,
    LocalDateTime expiresAt) {
}
