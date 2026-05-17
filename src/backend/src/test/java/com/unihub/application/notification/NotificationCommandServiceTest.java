package com.unihub.application.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.unihub.domain.notification.Notification;
import com.unihub.domain.notification.NotificationChannel;
import com.unihub.domain.notification.NotificationErrorCode;
import com.unihub.domain.notification.NotificationRepository;
import com.unihub.domain.notification.NotificationStatus;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class NotificationCommandServiceTest {
  private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-05-01T08:20:00Z"), ZoneOffset.UTC);

  @Mock
  private NotificationRepository notificationRepository;

  private NotificationCommandService service;

  @BeforeEach
  void setUp() {
    service = new NotificationCommandService(notificationRepository, CLOCK);
  }

  @Test
  void markReadUpdatesOwnUnreadNotification() {
    UUID userId = UUID.randomUUID();
    UUID notificationId = UUID.randomUUID();
    Notification notification = notification(notificationId, userId, null);
    when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(notification));

    MarkNotificationReadResult result = service.markRead(userId, notificationId);

    assertEquals(notificationId, result.notificationId());
    assertTrue(result.read());
    assertEquals(LocalDateTime.ofInstant(CLOCK.instant(), ZoneOffset.UTC), result.readAt());

    ArgumentCaptor<Notification> captor = forClass(Notification.class);
    verify(notificationRepository).update(captor.capture());
    assertEquals(result.readAt(), captor.getValue().readAt());
  }

  @Test
  void markReadIsIdempotentWhenAlreadyRead() {
    UUID userId = UUID.randomUUID();
    UUID notificationId = UUID.randomUUID();
    LocalDateTime readAt = LocalDateTime.parse("2026-05-01T08:10:00");
    when(notificationRepository.findById(notificationId))
        .thenReturn(Optional.of(notification(notificationId, userId, readAt)));

    MarkNotificationReadResult result = service.markRead(userId, notificationId);

    assertEquals(readAt, result.readAt());
    verify(notificationRepository, never()).update(org.mockito.ArgumentMatchers.any());
  }

  @Test
  void markReadRejectsOtherUsersNotification() {
    UUID notificationId = UUID.randomUUID();
    when(notificationRepository.findById(notificationId))
        .thenReturn(Optional.of(notification(notificationId, UUID.randomUUID(), null)));

    NotificationException ex = assertThrows(
        NotificationException.class,
        () -> service.markRead(UUID.randomUUID(), notificationId));

    assertSame(NotificationErrorCode.NOTIFY_ACCESS_DENIED, ex.getErrorCode());
    assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
  }

  @Test
  void markReadReturnsNotFoundForMissingNotification() {
    UUID notificationId = UUID.randomUUID();
    when(notificationRepository.findById(notificationId)).thenReturn(Optional.empty());

    NotificationException ex = assertThrows(
        NotificationException.class,
        () -> service.markRead(UUID.randomUUID(), notificationId));

    assertSame(NotificationErrorCode.NOTIFY_NOT_FOUND, ex.getErrorCode());
    assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
  }

  private Notification notification(UUID id, UUID userId, LocalDateTime readAt) {
    LocalDateTime createdAt = LocalDateTime.parse("2026-05-01T08:00:00");
    return new Notification(
        id,
        userId,
        "event-1",
        "WORKSHOP_UPDATED",
        NotificationChannel.IN_APP,
        "template",
        "Thông báo",
        "Nội dung",
        NotificationStatus.SENT,
        readAt,
        0,
        null,
        null,
        createdAt,
        createdAt);
  }
}
