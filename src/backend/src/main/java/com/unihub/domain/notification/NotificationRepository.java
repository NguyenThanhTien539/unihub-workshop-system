package com.unihub.domain.notification;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository {
  Optional<Notification> findByEventIdAndChannel(String eventId, NotificationChannel channel);

  default Optional<Notification> findEmailByEventId(String eventId) {
    return findByEventIdAndChannel(eventId, NotificationChannel.EMAIL);
  }

  Notification save(Notification notification);

  Notification update(Notification notification);

  Optional<Notification> findById(UUID notificationId);

  default Notification markSent(Notification notification, LocalDateTime updatedAt) {
    return update(new Notification(
        notification.id(),
        notification.recipientUserId(),
        notification.eventId(),
        notification.eventType(),
        notification.channel(),
        notification.templateKey(),
        notification.title(),
        notification.message(),
        NotificationStatus.SENT,
        notification.readAt(),
        notification.retryCount(),
        null,
        notification.lastErrorCode(),
        notification.createdAt(),
        updatedAt));
  }
}
