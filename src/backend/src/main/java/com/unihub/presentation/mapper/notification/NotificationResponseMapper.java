package com.unihub.presentation.mapper.notification;

import com.unihub.application.notification.MarkNotificationReadResult;
import com.unihub.domain.notification.Notification;
import com.unihub.presentation.dto.response.notification.MarkNotificationReadResponse;
import com.unihub.presentation.dto.response.notification.NotificationResponse;
import org.springframework.stereotype.Component;

@Component
public class NotificationResponseMapper {
  public NotificationResponse toResponse(Notification notification) {
    return new NotificationResponse(
        notification.id(),
        notification.title(),
        notification.message(),
        notification.channel().name(),
        notification.status().name(),
        notification.readAt() != null,
        notification.createdAt());
  }

  public MarkNotificationReadResponse toReadResponse(MarkNotificationReadResult result) {
    return new MarkNotificationReadResponse(
        result.notificationId(),
        result.read(),
        result.readAt());
  }
}
