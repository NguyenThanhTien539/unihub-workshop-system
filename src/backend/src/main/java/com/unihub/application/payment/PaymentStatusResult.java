package com.unihub.application.payment;

import java.util.UUID;

public record PaymentStatusResult(
    UUID paymentIntentId,
    UUID registrationId,
    String status,
    String registrationStatus,
    UUID qrTicketId,
    boolean qrAvailable) {
}
