package com.unihub.application.mail;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.unihub.domain.notification.Notification;
import com.unihub.domain.notification.NotificationChannel;
import com.unihub.domain.notification.NotificationRepository;
import com.unihub.domain.notification.NotificationStatus;
import com.unihub.domain.registration.RegistrationEmailView;
import com.unihub.domain.registration.RegistrationRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@ExtendWith(MockitoExtension.class)
class RegistrationConfirmationMailServiceTest {
  @Mock private RegistrationRepository registrationRepository;
  @Mock private NotificationRepository notificationRepository;
  @Mock private MailQueuePublisher mailQueuePublisher;

  private RegistrationConfirmationMailService service;
  private UUID registrationId;

  @BeforeEach
  void setUp() {
    service = new RegistrationConfirmationMailService(
        registrationRepository,
        notificationRepository,
        mailQueuePublisher,
        Clock.fixed(Instant.parse("2026-05-08T10:00:00Z"), ZoneOffset.UTC));
    registrationId = UUID.randomUUID();
  }

  @Test
  void existingNotificationDoesNotPublishDuplicateJob() {
    Notification existing = new Notification(UUID.randomUUID(), UUID.randomUUID(),
        RegistrationConfirmationMailService.eventId(registrationId), "REGISTRATION_CONFIRMED_EMAIL",
        NotificationChannel.EMAIL, "registration-confirmed", "Registration confirmed", "done",
        NotificationStatus.PENDING, null, 0, null, null, LocalDateTime.now(), LocalDateTime.now());
    when(notificationRepository.findEmailByEventId(RegistrationConfirmationMailService.eventId(registrationId)))
        .thenReturn(Optional.of(existing));
    when(registrationRepository.findEmailViewByRegistrationId(registrationId))
        .thenReturn(Optional.of(new RegistrationEmailView(registrationId, UUID.randomUUID(), "student@example.com",
            "Student", UUID.randomUUID(), "Workshop", "Room", "H1", LocalDateTime.now(), LocalDateTime.now())));

    service.queueRegistrationConfirmedEmail(registrationId);

    verify(mailQueuePublisher, never()).publish(org.mockito.ArgumentMatchers.any());
  }
}
