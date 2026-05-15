package com.unihub.infrastructure.queue.redis;

import com.unihub.application.mail.MailJob;
import com.unihub.application.mail.MailSenderService;
import com.unihub.application.mail.RegistrationConfirmedEmailContent;
import com.unihub.application.mail.RegistrationEmailTemplateBuilder;
import com.unihub.application.qr.QrTicketData;
import com.unihub.application.qr.QrTicketService;
import com.unihub.domain.notification.Notification;
import com.unihub.domain.notification.NotificationRepository;
import com.unihub.domain.notification.NotificationStatus;
import com.unihub.domain.registration.Registration;
import com.unihub.domain.registration.RegistrationEmailView;
import com.unihub.domain.registration.RegistrationRepository;
import com.unihub.domain.registration.RegistrationStatus;
import com.unihub.infrastructure.config.MailProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.connection.stream.StreamReadOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class MailQueueWorker {
  private static final Logger log = LoggerFactory.getLogger(MailQueueWorker.class);

  private final StringRedisTemplate stringRedisTemplate;
  private final MailProperties mailProperties;
  private final RedisMailQueuePublisher redisMailQueuePublisher;
  private final RegistrationRepository registrationRepository;
  private final NotificationRepository notificationRepository;
  private final QrTicketService qrTicketService;
  private final RegistrationEmailTemplateBuilder emailTemplateBuilder;
  private final MailSenderService mailSenderService;
  private final Clock clock;

  public MailQueueWorker(
      StringRedisTemplate stringRedisTemplate,
      MailProperties mailProperties,
      RedisMailQueuePublisher redisMailQueuePublisher,
      RegistrationRepository registrationRepository,
      NotificationRepository notificationRepository,
      QrTicketService qrTicketService,
      RegistrationEmailTemplateBuilder emailTemplateBuilder,
      MailSenderService mailSenderService,
      Clock clock) {
    this.stringRedisTemplate = stringRedisTemplate;
    this.mailProperties = mailProperties;
    this.redisMailQueuePublisher = redisMailQueuePublisher;
    this.registrationRepository = registrationRepository;
    this.notificationRepository = notificationRepository;
    this.qrTicketService = qrTicketService;
    this.emailTemplateBuilder = emailTemplateBuilder;
    this.mailSenderService = mailSenderService;
    this.clock = clock;
    initializeConsumerGroup();
  }

  @Scheduled(fixedDelayString = "${app.mail.queue.poll-interval-ms:5000}")
  public void poll() {
    if (!mailProperties.queue().enabled()) {
      return;
    }

    List<MapRecord<String, Object, Object>> records = stringRedisTemplate.opsForStream().read(
        Consumer.from(mailProperties.queue().consumerGroup(), mailProperties.queue().consumerName()),
        StreamReadOptions.empty().count(10).block(Duration.ofMillis(250)),
        StreamOffset.create(mailProperties.queue().stream(), ReadOffset.lastConsumed()));

    if (records == null || records.isEmpty()) {
      return;
    }

    for (MapRecord<String, Object, Object> record : records) {
      MailJob job;
      try {
        job = redisMailQueuePublisher.deserialize(record.getValue());
        process(job);
        acknowledge(record);
      } catch (Exception ex) {
        log.warn("Mail job processing failed for record {}", record.getId(), ex);
        if (record != null) {
          MailJob failedJob = null;
          try {
            failedJob = redisMailQueuePublisher.deserialize(record.getValue());
          } catch (Exception ignored) {
          }
          if (failedJob != null) {
            handleFailure(failedJob, ex);
          }
          acknowledge(record);
        }
      }
    }
  }

  private void process(MailJob job) {
    Notification notification = notificationRepository.findById(job.notificationId()).orElse(null);
    if (notification == null || notification.status() == NotificationStatus.SENT) {
      return;
    }

    Registration registration = registrationRepository.findById(job.registrationId())
        .orElseThrow(() -> new IllegalStateException("Registration not found for mail job"));
    if (registration.status() != RegistrationStatus.CONFIRMED) {
      throw new IllegalStateException("Registration is not confirmed yet");
    }

    RegistrationEmailView emailView = registrationRepository.findEmailViewByRegistrationId(job.registrationId())
        .orElseThrow(() -> new IllegalStateException("Email view not found for registration"));
    QrTicketData qrTicketData = qrTicketService.getQrTicketData(registration);
    RegistrationConfirmedEmailContent content = emailTemplateBuilder.build(emailView, qrTicketData);
    mailSenderService.sendRegistrationConfirmedEmail(content);

    notificationRepository.update(new Notification(
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
        LocalDateTime.now(clock)));
  }

  private void handleFailure(MailJob job, Exception ex) {
    Notification notification = notificationRepository.findById(job.notificationId()).orElse(null);
    if (notification == null || notification.status() == NotificationStatus.SENT) {
      return;
    }

    int nextRetryCount = notification.retryCount() + 1;
    boolean exhausted = nextRetryCount >= mailProperties.queue().maxRetries();
    NotificationStatus nextStatus = exhausted ? NotificationStatus.FAILED : NotificationStatus.RETRYING;
    LocalDateTime nextRetryAt = exhausted ? null : LocalDateTime.now(clock).plusSeconds(30L * nextRetryCount);

    Notification updated = new Notification(
        notification.id(),
        notification.recipientUserId(),
        notification.eventId(),
        notification.eventType(),
        notification.channel(),
        notification.templateKey(),
        notification.title(),
        notification.message(),
        nextStatus,
        notification.readAt(),
        nextRetryCount,
        nextRetryAt,
        ex.getClass().getSimpleName(),
        notification.createdAt(),
        LocalDateTime.now(clock));
    notificationRepository.update(updated);

    if (!exhausted) {
      redisMailQueuePublisher.publish(job);
    }
  }

  private void acknowledge(MapRecord<String, Object, Object> record) {
    stringRedisTemplate.opsForStream().acknowledge(mailProperties.queue().consumerGroup(), record);
  }

  private void initializeConsumerGroup() {
    if (!mailProperties.queue().enabled()) {
      return;
    }

    try {
      stringRedisTemplate.opsForStream().createGroup(mailProperties.queue().stream(), ReadOffset.latest(),
          mailProperties.queue().consumerGroup());
    } catch (Exception ex) {
      try {
        stringRedisTemplate.opsForStream().add(
            org.springframework.data.redis.connection.stream.StreamRecords.mapBacked(java.util.Map.of("bootstrap", "true"))
                .withStreamKey(mailProperties.queue().stream()));
        stringRedisTemplate.opsForStream().createGroup(mailProperties.queue().stream(), ReadOffset.latest(),
            mailProperties.queue().consumerGroup());
      } catch (Exception ignored) {
        // Group likely already exists.
      }
    }
  }
}
