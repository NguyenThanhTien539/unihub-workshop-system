package com.unihub.domain.registration;

import com.unihub.domain.payment.PaymentStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record RegistrationView(
    UUID registrationId,
    UUID studentId,
    UUID workshopId,
    String workshopTitle,
    UUID sessionId,
    String roomName,
    String building,
    LocalDateTime startAt,
    LocalDateTime endAt,
    RegistrationStatus registrationStatus,
    RegistrationType registrationType,
    UUID paymentIntentId,
    PaymentStatus paymentStatus,
    BigDecimal amount,
    String currency,
    LocalDateTime paymentExpiresAt,
    UUID qrTicketId,
    boolean qrAvailable,
    LocalDateTime createdAt,
    LocalDateTime confirmedAt) {
}
