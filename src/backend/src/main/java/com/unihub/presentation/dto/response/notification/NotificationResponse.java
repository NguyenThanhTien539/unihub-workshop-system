package com.unihub.presentation.dto.response.notification;

import java.time.LocalDateTime;
import java.util.UUID;

public record NotificationResponse(
    UUID id,
    String title,
    String message,
    String channel,
    String status,
    boolean read,
    LocalDateTime createdAt) {
}
