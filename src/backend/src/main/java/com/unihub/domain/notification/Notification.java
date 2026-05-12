package com.unihub.domain.notification;

import java.time.LocalDateTime;
import java.util.UUID;

public record Notification(
    UUID id,
    UUID recipientUserId,
    String eventId,
    String eventType,
    NotificationChannel channel,
    String templateKey,
    String title,
    String message,
    NotificationStatus status,
    LocalDateTime readAt,
    int retryCount,
    LocalDateTime nextRetryAt,
    String lastErrorCode,
    LocalDateTime createdAt,
    LocalDateTime updatedAt) {
}
