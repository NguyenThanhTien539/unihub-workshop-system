package com.unihub.presentation.dto.response.registration;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record RegistrationResponse(
    UUID registrationId,
    UUID workshopId,
    String workshopTitle,
    UUID sessionId,
    String roomName,
    String building,
    LocalDateTime startAt,
    LocalDateTime endAt,
    String registrationStatus,
    String registrationType,
    UUID paymentIntentId,
    String paymentStatus,
    BigDecimal amount,
    String currency,
    LocalDateTime paymentExpiresAt,
    UUID qrTicketId,
    boolean qrAvailable,
    LocalDateTime createdAt,
    LocalDateTime confirmedAt) {
}
