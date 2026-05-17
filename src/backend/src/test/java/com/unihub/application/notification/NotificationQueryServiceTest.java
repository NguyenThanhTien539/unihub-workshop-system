package com.unihub.application.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.unihub.domain.notification.Notification;
import com.unihub.domain.notification.NotificationRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationQueryServiceTest {
  @Mock
  private NotificationRepository notificationRepository;

  private NotificationQueryService service;

  @BeforeEach
  void setUp() {
    service = new NotificationQueryService(notificationRepository);
  }

  @Test
  void getMyNotificationsReadsOnlyCurrentUsersNotificationsNewestFirstFromRepository() {
    UUID userId = UUID.randomUUID();
    List<Notification> expected = List.of();
    when(notificationRepository.findByRecipientUserId(userId, 30)).thenReturn(expected);

    List<Notification> result = service.getMyNotifications(userId);

    assertEquals(expected, result);
    verify(notificationRepository).findByRecipientUserId(userId, 30);
  }
}
