package com.unihub.infrastructure.queue.redis;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.unihub.application.mail.MailJob;
import com.unihub.application.mail.MailQueuePublisher;
import com.unihub.infrastructure.config.MailProperties;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class RedisMailQueuePublisher implements MailQueuePublisher {
  private final StringRedisTemplate stringRedisTemplate;
  private final MailProperties mailProperties;
  private final ObjectMapper objectMapper;

  public RedisMailQueuePublisher(
      StringRedisTemplate stringRedisTemplate,
      MailProperties mailProperties,
      ObjectMapper objectMapper) {
    this.stringRedisTemplate = stringRedisTemplate;
    this.mailProperties = mailProperties;
    this.objectMapper = objectMapper;
  }

  @Override
  public void publish(MailJob job) {
    if (!mailProperties.queue().enabled()) {
      return;
    }
    Map<String, String> fields = new LinkedHashMap<>();
    fields.put("notificationId", job.notificationId().toString());
    fields.put("registrationId", job.registrationId().toString());
    fields.put("recipientUserId", job.recipientUserId().toString());
    fields.put("recipientEmail", job.recipientEmail());
    fields.put("eventId", job.eventId());
    fields.put("type", job.type().name());
    RecordId ignored = stringRedisTemplate.opsForStream().add(
        StreamRecords.mapBacked(fields).withStreamKey(mailProperties.queue().stream()));
  }

  public MailJob deserialize(Map<Object, Object> fields) {
    try {
      return new MailJob(
          java.util.UUID.fromString(String.valueOf(fields.get("notificationId"))),
          java.util.UUID.fromString(String.valueOf(fields.get("registrationId"))),
          java.util.UUID.fromString(String.valueOf(fields.get("recipientUserId"))),
          String.valueOf(fields.get("recipientEmail")),
          String.valueOf(fields.get("eventId")),
          com.unihub.application.mail.MailJobType.valueOf(String.valueOf(fields.get("type"))));
    } catch (Exception ex) {
      throw new IllegalStateException("Unable to deserialize mail job", ex);
    }
  }
}
