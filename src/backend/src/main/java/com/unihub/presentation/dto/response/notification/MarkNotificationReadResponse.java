package com.unihub.presentation.dto.response.notification;

import java.time.LocalDateTime;
import java.util.UUID;

public record MarkNotificationReadResponse(
    UUID notificationId,
    boolean read,
    LocalDateTime readAt) {
}
