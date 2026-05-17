package com.unihub.application.notification;

import com.unihub.domain.notification.Notification;
import com.unihub.domain.notification.NotificationChannel;
import com.unihub.domain.notification.NotificationRepository;
import com.unihub.domain.notification.NotificationStatus;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class WorkshopNotificationService {
  private static final Logger log = LoggerFactory.getLogger(WorkshopNotificationService.class);
  private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
  private static final String TEMPLATE_KEY = "workshop-change";

  private final NamedParameterJdbcTemplate jdbcTemplate;
  private final NotificationRepository notificationRepository;
  private final Clock clock;

  public WorkshopNotificationService(
      NamedParameterJdbcTemplate jdbcTemplate,
      NotificationRepository notificationRepository,
      Clock clock) {
    this.jdbcTemplate = jdbcTemplate;
    this.notificationRepository = notificationRepository;
    this.clock = clock;
  }

  public void queueWorkshopUpdated(UUID workshopId, boolean titleChanged, boolean speakerChanged) {
    if (!titleChanged && !speakerChanged) {
      return;
    }
    String eventId = "workshop-updated:" + workshopId + ":" + System.nanoTime();
    afterCommit(() -> createWorkshopNotifications(
        workshopId,
        eventId,
        "WORKSHOP_UPDATED",
        "Thông tin workshop đã được cập nhật",
        recipient -> "Workshop " + recipient.workshopTitle()
            + " đã cập nhật thông tin. Vui lòng kiểm tra lại thời gian và phòng học."));
  }

  public void queueWorkshopCanceled(UUID workshopId) {
    String eventId = "workshop-canceled:" + workshopId;
    afterCommit(() -> createWorkshopNotifications(
        workshopId,
        eventId,
        "WORKSHOP_CANCELED",
        "Workshop đã bị hủy",
        recipient -> "Workshop " + recipient.workshopTitle()
            + " đã bị hủy. Bạn không cần check-in cho buổi này."));
  }

  public void queueSessionUpdated(
      UUID sessionId,
      boolean roomChanged,
      boolean timeChanged) {
    if (!roomChanged && !timeChanged) {
      return;
    }
    String eventId = "session-updated:" + sessionId + ":" + System.nanoTime();
    afterCommit(() -> createSessionNotifications(
        sessionId,
        eventId,
        "SESSION_UPDATED",
        "Thông tin buổi workshop đã được cập nhật",
        recipient -> sessionUpdateMessage(recipient, roomChanged, timeChanged)));
  }

  public void queueSessionCanceled(UUID sessionId) {
    String eventId = "session-canceled:" + sessionId;
    afterCommit(() -> createSessionNotifications(
        sessionId,
        eventId,
        "SESSION_CANCELED",
        "Buổi workshop đã bị hủy",
        recipient -> "Buổi " + recipient.workshopTitle() + " vào "
            + formatTime(recipient.startAt())
            + " đã bị hủy. Vui lòng kiểm tra thông báo từ ban tổ chức."));
  }

  private String sessionUpdateMessage(
      WorkshopNotificationRecipient recipient,
      boolean roomChanged,
      boolean timeChanged) {
    if (roomChanged && !timeChanged) {
      return "Buổi " + recipient.workshopTitle() + " đã đổi phòng sang "
          + roomLabel(recipient) + ".";
    }
    if (timeChanged && !roomChanged) {
      return "Buổi " + recipient.workshopTitle()
          + " đã đổi thời gian. Vui lòng kiểm tra lại lịch tham dự.";
    }
    return "Buổi " + recipient.workshopTitle()
        + " đã cập nhật thời gian và phòng học. Vui lòng kiểm tra lại lịch tham dự.";
  }

  private void createWorkshopNotifications(
      UUID workshopId,
      String eventId,
      String eventType,
      String title,
      MessageFactory messageFactory) {
    List<WorkshopNotificationRecipient> recipients = findWorkshopRecipients(workshopId);
    createNotifications(recipients, eventId, eventType, title, messageFactory);
  }

  private void createSessionNotifications(
      UUID sessionId,
      String eventId,
      String eventType,
      String title,
      MessageFactory messageFactory) {
    List<WorkshopNotificationRecipient> recipients = findSessionRecipients(sessionId);
    createNotifications(recipients, eventId, eventType, title, messageFactory);
  }

  private void createNotifications(
      List<WorkshopNotificationRecipient> recipients,
      String eventId,
      String eventType,
      String title,
      MessageFactory messageFactory) {
    LocalDateTime now = LocalDateTime.now(clock);
    for (WorkshopNotificationRecipient recipient : recipients) {
      if (notificationRepository.findByEventIdRecipientAndChannel(
          eventId,
          recipient.recipientUserId(),
          NotificationChannel.IN_APP).isPresent()) {
        continue;
      }
      Notification notification = new Notification(
          UUID.randomUUID(),
          recipient.recipientUserId(),
          eventId,
          eventType,
          NotificationChannel.IN_APP,
          TEMPLATE_KEY,
          title,
          messageFactory.message(recipient),
          NotificationStatus.SENT,
          null,
          0,
          null,
          null,
          now,
          now);
      try {
        notificationRepository.save(notification);
      } catch (DataIntegrityViolationException ex) {
        log.debug("Notification already exists for event {} and recipient {}", eventId, recipient.recipientUserId());
      }
    }
  }

  private List<WorkshopNotificationRecipient> findWorkshopRecipients(UUID workshopId) {
    String sql = BASE_RECIPIENT_SELECT + """
        WHERE s.workshop_id = :workshopId
          AND reg.status IN ('PENDING_PAYMENT', 'CONFIRMED')
          AND st.user_id IS NOT NULL
        ORDER BY s.start_at
        """;
    return jdbcTemplate.query(
        sql,
        new MapSqlParameterSource("workshopId", workshopId),
        (rs, rowNum) -> new WorkshopNotificationRecipient(
            rs.getObject("recipient_user_id", UUID.class),
            rs.getString("workshop_title"),
            rs.getString("room_name"),
            rs.getString("building"),
            toLocalDateTime(rs.getTimestamp("start_at")),
            toLocalDateTime(rs.getTimestamp("end_at"))));
  }

  private List<WorkshopNotificationRecipient> findSessionRecipients(UUID sessionId) {
    String sql = BASE_RECIPIENT_SELECT + """
        WHERE s.id = :sessionId
          AND reg.status IN ('PENDING_PAYMENT', 'CONFIRMED')
          AND st.user_id IS NOT NULL
        ORDER BY s.start_at
        """;
    return jdbcTemplate.query(
        sql,
        new MapSqlParameterSource("sessionId", sessionId),
        (rs, rowNum) -> new WorkshopNotificationRecipient(
            rs.getObject("recipient_user_id", UUID.class),
            rs.getString("workshop_title"),
            rs.getString("room_name"),
            rs.getString("building"),
            toLocalDateTime(rs.getTimestamp("start_at")),
            toLocalDateTime(rs.getTimestamp("end_at"))));
  }

  private void afterCommit(Runnable action) {
    if (!TransactionSynchronizationManager.isSynchronizationActive()) {
      runSafely(action);
      return;
    }
    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
      @Override
      public void afterCommit() {
        runSafely(action);
      }
    });
  }

  private void runSafely(Runnable action) {
    try {
      action.run();
    } catch (Exception ex) {
      log.warn("Failed to create workshop notifications", ex);
    }
  }

  private String roomLabel(WorkshopNotificationRecipient recipient) {
    if (recipient.building() == null || recipient.building().isBlank()) {
      return recipient.roomName();
    }
    return recipient.roomName() + " (" + recipient.building() + ")";
  }

  private String formatTime(LocalDateTime value) {
    return value == null ? "lịch tham dự" : DATE_TIME_FORMATTER.format(value);
  }

  private LocalDateTime toLocalDateTime(Timestamp timestamp) {
    return timestamp == null ? null : timestamp.toLocalDateTime();
  }

  private static final String BASE_RECIPIENT_SELECT = """
      SELECT DISTINCT st.user_id AS recipient_user_id,
             w.title AS workshop_title,
             r.name AS room_name,
             r.building,
             s.start_at,
             s.end_at
      FROM registrations reg
      JOIN students st ON st.id = reg.student_id
      JOIN workshop_sessions s ON s.id = reg.session_id
      JOIN workshops w ON w.id = s.workshop_id
      LEFT JOIN rooms r ON r.id = s.room_id
      """;

  private interface MessageFactory {
    String message(WorkshopNotificationRecipient recipient);
  }

  private record WorkshopNotificationRecipient(
      UUID recipientUserId,
      String workshopTitle,
      String roomName,
      String building,
      LocalDateTime startAt,
      LocalDateTime endAt) {
  }
}
