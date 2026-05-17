package com.unihub.infrastructure.persistence.notification;

import com.unihub.domain.notification.Notification;
import com.unihub.domain.notification.NotificationChannel;
import com.unihub.domain.notification.NotificationRepository;
import com.unihub.domain.notification.NotificationStatus;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class NotificationRepositoryAdapter implements NotificationRepository {
  private static final String BASE_SELECT = """
      SELECT id, recipient_user_id, event_id, event_type, channel, template_key, title, message,
             status, read_at, retry_count, next_retry_at, last_error_code, created_at, updated_at
      FROM notifications
      """;

  private static final String SQL_INSERT = """
      INSERT INTO notifications (
        id, recipient_user_id, event_id, event_type, channel, template_key, title, message,
        status, read_at, retry_count, next_retry_at, last_error_code, created_at, updated_at
      ) VALUES (
        :id, :recipientUserId, :eventId, :eventType, :channel, :templateKey, :title, :message,
        :status, :readAt, :retryCount, :nextRetryAt, :lastErrorCode, :createdAt, :updatedAt
      )
      """;

  private static final String SQL_UPDATE = """
      UPDATE notifications
      SET title = :title,
          message = :message,
          status = :status,
          read_at = :readAt,
          retry_count = :retryCount,
          next_retry_at = :nextRetryAt,
          last_error_code = :lastErrorCode,
          updated_at = :updatedAt
      WHERE id = :id
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;

  public NotificationRepositoryAdapter(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public Optional<Notification> findByEventIdAndChannel(String eventId, NotificationChannel channel) {
    String sql = BASE_SELECT + " WHERE event_id = :eventId AND channel = :channel LIMIT 1";
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("eventId", eventId)
        .addValue("channel", channel.name());
    List<Notification> rows = jdbcTemplate.query(sql, params, rowMapper());
    return rows.stream().findFirst();
  }

  @Override
  public Optional<Notification> findByEventIdRecipientAndChannel(
      String eventId,
      UUID recipientUserId,
      NotificationChannel channel) {
    String sql = BASE_SELECT + """
        WHERE event_id = :eventId
          AND recipient_user_id = :recipientUserId
          AND channel = :channel
        LIMIT 1
        """;
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("eventId", eventId)
        .addValue("recipientUserId", recipientUserId)
        .addValue("channel", channel.name());
    List<Notification> rows = jdbcTemplate.query(sql, params, rowMapper());
    return rows.stream().findFirst();
  }

  @Override
  public Notification save(Notification notification) {
    jdbcTemplate.update(SQL_INSERT, params(notification));
    return notification;
  }

  @Override
  public Notification update(Notification notification) {
    jdbcTemplate.update(SQL_UPDATE, params(notification));
    return notification;
  }

  @Override
  public Optional<Notification> findById(UUID notificationId) {
    String sql = BASE_SELECT + " WHERE id = :id LIMIT 1";
    List<Notification> rows = jdbcTemplate.query(sql, new MapSqlParameterSource("id", notificationId), rowMapper());
    return rows.stream().findFirst();
  }

  @Override
  public List<Notification> findByRecipientUserId(UUID recipientUserId, int limit) {
    String sql = BASE_SELECT + """
        WHERE recipient_user_id = :recipientUserId
          AND channel = 'IN_APP'
        ORDER BY created_at DESC
        LIMIT :limit
        """;
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("recipientUserId", recipientUserId)
        .addValue("limit", Math.max(1, limit));
    return jdbcTemplate.query(sql, params, rowMapper());
  }

  private MapSqlParameterSource params(Notification notification) {
    return new MapSqlParameterSource()
        .addValue("id", notification.id())
        .addValue("recipientUserId", notification.recipientUserId())
        .addValue("eventId", notification.eventId())
        .addValue("eventType", notification.eventType())
        .addValue("channel", notification.channel().name())
        .addValue("templateKey", notification.templateKey())
        .addValue("title", notification.title())
        .addValue("message", notification.message())
        .addValue("status", notification.status().name())
        .addValue("readAt", toTimestamp(notification.readAt()))
        .addValue("retryCount", notification.retryCount())
        .addValue("nextRetryAt", toTimestamp(notification.nextRetryAt()))
        .addValue("lastErrorCode", notification.lastErrorCode())
        .addValue("createdAt", Timestamp.valueOf(notification.createdAt()))
        .addValue("updatedAt", Timestamp.valueOf(notification.updatedAt()));
  }

  private RowMapper<Notification> rowMapper() {
    return (rs, rowNum) -> new Notification(
        rs.getObject("id", UUID.class),
        rs.getObject("recipient_user_id", UUID.class),
        rs.getString("event_id"),
        rs.getString("event_type"),
        NotificationChannel.valueOf(rs.getString("channel")),
        rs.getString("template_key"),
        rs.getString("title"),
        rs.getString("message"),
        NotificationStatus.valueOf(rs.getString("status")),
        toLocalDateTime(rs.getTimestamp("read_at")),
        rs.getInt("retry_count"),
        toLocalDateTime(rs.getTimestamp("next_retry_at")),
        rs.getString("last_error_code"),
        toLocalDateTime(rs.getTimestamp("created_at")),
        toLocalDateTime(rs.getTimestamp("updated_at")));
  }

  private Timestamp toTimestamp(LocalDateTime value) {
    return value == null ? null : Timestamp.valueOf(value);
  }

  private LocalDateTime toLocalDateTime(Timestamp value) {
    return value == null ? null : value.toLocalDateTime();
  }
}
