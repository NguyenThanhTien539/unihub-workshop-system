package com.unihub.application.mail;

import com.unihub.domain.notification.Notification;
import com.unihub.domain.notification.NotificationChannel;
import com.unihub.domain.notification.NotificationRepository;
import com.unihub.domain.notification.NotificationStatus;
import com.unihub.domain.registration.RegistrationEmailView;
import com.unihub.domain.registration.RegistrationRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class RegistrationConfirmationMailService {
  private static final Logger log = LoggerFactory.getLogger(RegistrationConfirmationMailService.class);
  private static final String EVENT_TYPE = "REGISTRATION_CONFIRMED_EMAIL";
  private static final String TEMPLATE_KEY = "registration-confirmed";

  private final RegistrationRepository registrationRepository;
  private final NotificationRepository notificationRepository;
  private final MailQueuePublisher mailQueuePublisher;
  private final Clock clock;

  public RegistrationConfirmationMailService(
      RegistrationRepository registrationRepository,
      NotificationRepository notificationRepository,
      MailQueuePublisher mailQueuePublisher,
      Clock clock) {
    this.registrationRepository = registrationRepository;
    this.notificationRepository = notificationRepository;
    this.mailQueuePublisher = mailQueuePublisher;
    this.clock = clock;
  }

  public void queueRegistrationConfirmedEmail(UUID registrationId) {
    RegistrationEmailView emailView = registrationRepository.findEmailViewByRegistrationId(registrationId)
        .orElseThrow(() -> new IllegalStateException("Registration email view not found"));

    String eventId = eventId(registrationId);
    Notification existing = notificationRepository.findEmailByEventId(eventId).orElse(null);
    if (existing != null) {
      return;
    }

    Notification notification = createNotification(emailView, eventId);
    registerAfterCommit(notification, emailView, registrationId);
  }

  public static String eventId(UUID registrationId) {
    return "registration-confirmed:" + registrationId;
  }

  private Notification createNotification(RegistrationEmailView emailView, String eventId) {
    LocalDateTime now = LocalDateTime.now(clock);
    Notification notification = new Notification(
        UUID.randomUUID(),
        emailView.recipientUserId(),
        eventId,
        EVENT_TYPE,
        NotificationChannel.EMAIL,
        TEMPLATE_KEY,
        "Registration confirmed",
        "Your workshop registration has been confirmed.",
        NotificationStatus.PENDING,
        null,
        0,
        null,
        null,
        now,
        now);
    return notificationRepository.save(notification);
  }

  private void registerAfterCommit(Notification notification, RegistrationEmailView emailView, UUID registrationId) {
    if (!TransactionSynchronizationManager.isSynchronizationActive()) {
      publish(notification, emailView, registrationId);
      return;
    }

    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
      @Override
      public void afterCommit() {
        publish(notification, emailView, registrationId);
      }
    });
  }

  private void publish(Notification notification, RegistrationEmailView emailView, UUID registrationId) {
    try {
      mailQueuePublisher.publish(new MailJob(
          notification.id(),
          registrationId,
          emailView.recipientUserId(),
          emailView.recipientEmail(),
          notification.eventId(),
          MailJobType.REGISTRATION_CONFIRMED_EMAIL));
    } catch (Exception ex) {
      log.warn("Failed to publish registration confirmation email job for registration {}", registrationId, ex);
    }
  }
}
