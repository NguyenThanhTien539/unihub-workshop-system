package com.unihub.application.notification;

import java.time.LocalDateTime;
import java.util.UUID;

public record MarkNotificationReadResult(
    UUID notificationId,
    boolean read,
    LocalDateTime readAt) {
}
