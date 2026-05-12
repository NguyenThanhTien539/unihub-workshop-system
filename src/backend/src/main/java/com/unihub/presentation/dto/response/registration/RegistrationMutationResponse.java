package com.unihub.presentation.dto.response.registration;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record RegistrationMutationResponse(
    UUID registrationId,
    UUID workshopId,
    UUID sessionId,
    String registrationStatus,
    boolean qrAvailable,
    UUID paymentIntentId,
    String paymentStatus,
    BigDecimal amount,
    String currency,
    LocalDateTime expiresAt) {
}
