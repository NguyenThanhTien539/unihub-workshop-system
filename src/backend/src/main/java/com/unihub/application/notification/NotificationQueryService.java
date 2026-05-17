package com.unihub.application.notification;

import com.unihub.domain.notification.Notification;
import com.unihub.domain.notification.NotificationRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationQueryService {
  private static final int DEFAULT_LIMIT = 30;

  private final NotificationRepository notificationRepository;

  public NotificationQueryService(NotificationRepository notificationRepository) {
    this.notificationRepository = notificationRepository;
  }

  @Transactional(readOnly = true)
  public List<Notification> getMyNotifications(UUID userId) {
    return notificationRepository.findByRecipientUserId(userId, DEFAULT_LIMIT);
  }
}
