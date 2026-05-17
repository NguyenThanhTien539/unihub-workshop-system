package com.unihub.application.notification;

import com.unihub.domain.notification.Notification;
import com.unihub.domain.notification.NotificationErrorCode;
import com.unihub.domain.notification.NotificationRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationCommandService {
  private final NotificationRepository notificationRepository;
  private final Clock clock;

  public NotificationCommandService(NotificationRepository notificationRepository, Clock clock) {
    this.notificationRepository = notificationRepository;
    this.clock = clock;
  }

  @Transactional
  public MarkNotificationReadResult markRead(UUID currentUserId, UUID notificationId) {
    Notification notification = notificationRepository.findById(notificationId)
        .orElseThrow(() -> new NotificationException(
            NotificationErrorCode.NOTIFY_NOT_FOUND,
            HttpStatus.NOT_FOUND));

    if (!notification.recipientUserId().equals(currentUserId)) {
      throw new NotificationException(
          NotificationErrorCode.NOTIFY_ACCESS_DENIED,
          HttpStatus.FORBIDDEN);
    }

    if (notification.readAt() != null) {
      return new MarkNotificationReadResult(notification.id(), true, notification.readAt());
    }

    LocalDateTime now = LocalDateTime.now(clock);
    Notification updated = new Notification(
        notification.id(),
        notification.recipientUserId(),
        notification.eventId(),
        notification.eventType(),
        notification.channel(),
        notification.templateKey(),
        notification.title(),
        notification.message(),
        notification.status(),
        now,
        notification.retryCount(),
        notification.nextRetryAt(),
        notification.lastErrorCode(),
        notification.createdAt(),
        now);
    notificationRepository.update(updated);

    return new MarkNotificationReadResult(updated.id(), true, now);
  }
}
