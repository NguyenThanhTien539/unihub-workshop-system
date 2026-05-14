package com.unihub.presentation.dto.response.payment;

import java.util.UUID;

public record PaymentStatusResponse(
    UUID paymentIntentId,
    UUID registrationId,
    String status,
    String registrationStatus,
    boolean qrAvailable) {
}
