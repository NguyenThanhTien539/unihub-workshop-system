package com.unihub.infrastructure.payment.zalopay;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record ZaloPayCallbackPayload(
    String providerTransactionId,
    UUID paymentIntentId,
    UUID registrationId,
    BigDecimal amount,
    String currency,
    LocalDateTime paidAt,
    boolean success,
    String failureReason) {
}
