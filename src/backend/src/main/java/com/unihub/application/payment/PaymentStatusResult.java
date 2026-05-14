package com.unihub.application.payment;

import java.time.LocalDateTime;
import java.util.UUID;

public record PaymentStatusResult(
    UUID paymentIntentId,
    UUID registrationId,
    String status,
    String registrationStatus,
    boolean qrAvailable) {
}
