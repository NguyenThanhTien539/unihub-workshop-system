package com.unihub.application.mail;

import com.unihub.domain.notification.Notification;
import com.unihub.domain.notification.NotificationChannel;
import com.unihub.domain.notification.NotificationRepository;
import com.unihub.domain.notification.NotificationStatus;
import com.unihub.domain.registration.Registration;
import com.unihub.domain.registration.RegistrationEmailView;
import com.unihub.domain.registration.RegistrationRepository;
import com.unihub.domain.registration.RegistrationStatus;
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
  private static final String EMAIL_EVENT_TYPE = "REGISTRATION_CONFIRMED_EMAIL";
  private static final String IN_APP_EVENT_TYPE = "REGISTRATION_CONFIRMED";
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

  public void queueRegistrationConfirmedNotifications(UUID registrationId) {
    registerAfterCommit(registrationId, eventId(registrationId));
  }

  public static String eventId(UUID registrationId) {
    return "registration-confirmed:" + registrationId;
  }

  public void queueRegistrationConfirmedEmail(UUID registrationId) {
    queueRegistrationConfirmedNotifications(registrationId);
  }

  private Notification createEmailNotification(RegistrationEmailView emailView, String eventId) {
    LocalDateTime now = LocalDateTime.now(clock);
    return new Notification(
        UUID.randomUUID(),
        emailView.recipientUserId(),
        eventId,
        EMAIL_EVENT_TYPE,
        NotificationChannel.EMAIL,
        TEMPLATE_KEY,
        "Đăng ký thành công",
        "Bạn đã đăng ký thành công workshop " + emailView.workshopTitle() + ".",
        NotificationStatus.PENDING,
        null,
        0,
        null,
        null,
        now,
        now);
  }

  private Notification createInAppNotification(RegistrationEmailView emailView, String eventId) {
    LocalDateTime now = LocalDateTime.now(clock);
    return new Notification(
        UUID.randomUUID(),
        emailView.recipientUserId(),
        eventId,
        IN_APP_EVENT_TYPE,
        NotificationChannel.IN_APP,
        TEMPLATE_KEY,
        "Đăng ký thành công",
        "Bạn đã đăng ký thành công workshop " + emailView.workshopTitle() + ".",
        NotificationStatus.SENT,
        null,
        0,
        null,
        null,
        now,
        now);
  }

  private void registerAfterCommit(UUID registrationId, String eventId) {
    if (!TransactionSynchronizationManager.isSynchronizationActive()) {
      try {
        createNotificationsAndPublish(registrationId, eventId);
      } catch (Exception ex) {
        log.warn("Failed to queue registration confirmation notifications for registration {}", registrationId, ex);
      }
      return;
    }

    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
      @Override
      public void afterCommit() {
        try {
          createNotificationsAndPublish(registrationId, eventId);
        } catch (Exception ex) {
          log.warn("Failed to queue registration confirmation notifications for registration {}", registrationId, ex);
        }
      }
    });
  }

  private void createNotificationsAndPublish(UUID registrationId, String eventId) {
    Registration registration = registrationRepository.findById(registrationId)
        .orElseThrow(() -> new IllegalStateException("Registration not found"));
    if (registration.status() != RegistrationStatus.CONFIRMED) {
      log.info(
          "Skip registration confirmation notification because status is {} for registration {}",
          registration.status(),
          registrationId);
      return;
    }
    RegistrationEmailView emailView = registrationRepository.findEmailViewByRegistrationId(registrationId)
        .orElseThrow(() -> new IllegalStateException("Registration email view not found"));
    ensureInAppNotification(emailView, eventId);
    EmailNotification emailNotification = ensureEmailNotification(emailView, eventId);
    if (emailNotification.newlyCreated()) {
      publish(emailNotification.notification(), emailView, registrationId);
    }
  }

  private void ensureInAppNotification(RegistrationEmailView emailView, String eventId) {
    Notification existing = notificationRepository.findByEventIdAndChannel(eventId, NotificationChannel.IN_APP)
        .orElse(null);
    if (existing != null) {
      return;
    }
    notificationRepository.save(createInAppNotification(emailView, eventId));
  }

  private EmailNotification ensureEmailNotification(RegistrationEmailView emailView, String eventId) {
    Notification existing = notificationRepository.findEmailByEventId(eventId).orElse(null);
    if (existing != null) {
      return new EmailNotification(existing, false);
    }
    return new EmailNotification(notificationRepository.save(createEmailNotification(emailView, eventId)), true);
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

  private record EmailNotification(Notification notification, boolean newlyCreated) {
  }
}
