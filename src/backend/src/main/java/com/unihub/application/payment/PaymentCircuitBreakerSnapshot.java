package com.unihub.application.payment;

import java.time.LocalDateTime;

public record PaymentCircuitBreakerSnapshot(
    String provider,
    PaymentCircuitBreakerState state,
    int failureCount,
    LocalDateTime openedAt,
    LocalDateTime nextRetryAt) {
}
