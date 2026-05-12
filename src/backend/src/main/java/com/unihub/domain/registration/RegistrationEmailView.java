package com.unihub.domain.registration;

import java.time.LocalDateTime;
import java.util.UUID;

public record RegistrationEmailView(
    UUID registrationId,
    UUID recipientUserId,
    String recipientEmail,
    String recipientName,
    UUID workshopId,
    String workshopTitle,
    String roomName,
    String building,
    LocalDateTime startAt,
    LocalDateTime endAt) {
}
