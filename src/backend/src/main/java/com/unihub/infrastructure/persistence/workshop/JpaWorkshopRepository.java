package com.unihub.infrastructure.persistence.workshop;

import com.unihub.domain.room.Room;
import com.unihub.domain.room.RoomStatus;
import com.unihub.domain.workshop.FeeType;
import com.unihub.domain.workshop.Workshop;
import com.unihub.domain.workshop.WorkshopRepository;
import com.unihub.domain.workshop.WorkshopSession;
import com.unihub.domain.workshop.WorkshopSessionView;
import com.unihub.domain.workshop.WorkshopStatus;
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
public class JpaWorkshopRepository implements WorkshopRepository {
  private static final String SQL_FIND_BY_ID = """
      SELECT id, title, speaker, description, status, created_by_user_id, created_at, updated_at, published_at, canceled_at
      FROM workshops
      WHERE id = :id
      LIMIT 1
      """;

  private static final String SQL_INSERT_WORKSHOP = """
      INSERT INTO workshops (id, title, speaker, description, status, created_by_user_id, created_at, updated_at, published_at, canceled_at)
      VALUES (:id, :title, :speaker, :description, :status, :createdByUserId, :createdAt, :updatedAt, :publishedAt, :canceledAt)
      """;

  private static final String SQL_UPDATE_WORKSHOP = """
      UPDATE workshops
      SET title = :title,
          speaker = :speaker,
          description = :description,
          updated_at = :updatedAt
      WHERE id = :id
      """;

  private static final String SQL_UPDATE_WORKSHOP_STATUS = """
      UPDATE workshops
      SET status = :status,
          published_at = :publishedAt,
          canceled_at = :canceledAt,
          updated_at = :updatedAt
      WHERE id = :id
      """;

  private static final String SQL_FIND_SESSION_BY_ID = """
      SELECT id, workshop_id, room_id, start_at, end_at, status, seat_capacity, seats_confirmed, seats_reserved,
             fee_type, fee_amount, currency, created_at, updated_at, canceled_at
      FROM workshop_sessions
      WHERE id = :id
      LIMIT 1
          """;

  private static final String SQL_FIND_SESSIONS_BY_WORKSHOP_ID = """
      SELECT id, workshop_id, room_id, start_at, end_at, status, seat_capacity, seats_confirmed, seats_reserved,
             fee_type, fee_amount, currency, created_at, updated_at, canceled_at
      FROM workshop_sessions
            WHERE workshop_id = :workshopId
      ORDER BY start_at
      """;

  private static final String SQL_INSERT_SESSION = """
      INSERT INTO workshop_sessions (id, workshop_id, room_id, start_at, end_at, status, seat_capacity,
                     seats_confirmed, seats_reserved, fee_type, fee_amount, currency,
                     created_at, updated_at, canceled_at)
      VALUES (:id, :workshopId, :roomId, :startAt, :endAt, :status, :seatCapacity,
          :seatsConfirmed, :seatsReserved, :feeType, :feeAmount, :currency,
          :createdAt, :updatedAt, :canceledAt)
      """;

  private static final String SQL_UPDATE_SESSION = """
      UPDATE workshop_sessions
      SET room_id = :roomId,
          start_at = :startAt,
          end_at = :endAt,
          status = :status,
          seat_capacity = :seatCapacity,
          seats_confirmed = :seatsConfirmed,
          seats_reserved = :seatsReserved,
          fee_type = :feeType,
          fee_amount = :feeAmount,
          currency = :currency,
          updated_at = :updatedAt,
          canceled_at = :canceledAt
        WHERE id = :id
      """;

  private static final String SQL_CANCEL_SESSIONS_BY_WORKSHOP_ID = """
      UPDATE workshop_sessions
      SET status = 'CANCELED',
          canceled_at = :canceledAt,
          updated_at = :updatedAt
      WHERE workshop_id = :workshopId AND status <> 'CANCELED'
      """;

  private static final String SQL_EXISTS_ROOM_CONFLICT = """
      SELECT COUNT(1)
      FROM workshop_sessions
      WHERE room_id = :roomId
        AND status <> 'CANCELED'
        AND start_at < :endAt
        AND end_at > :startAt
        AND (CAST(:excludeId AS uuid) IS NULL OR id <> :excludeId)
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;

  public JpaWorkshopRepository(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public Optional<Workshop> findById(UUID workshopId) {
    MapSqlParameterSource params = new MapSqlParameterSource("id", workshopId);
    List<Workshop> rows = jdbcTemplate.query(SQL_FIND_BY_ID, params, workshopRowMapper());
    return rows.stream().findFirst();
  }

  @Override
  public List<WorkshopSessionView> findPublishedWorkshopSessions(
      String keyword,
      FeeType feeType,
      UUID roomId,
      LocalDateTime startAt,
      LocalDateTime endAt,
      Integer page,
      Integer size) {
    QueryBundle bundle = buildPublishedQuery(keyword, feeType, roomId, startAt, endAt, page, size);
    return jdbcTemplate.query(bundle.sql(), bundle.params(), workshopSessionViewRowMapper());
  }

  @Override
  public Optional<WorkshopSession> findSessionById(UUID sessionId) {
    MapSqlParameterSource params = new MapSqlParameterSource("id", sessionId);
    List<WorkshopSession> rows = jdbcTemplate.query(SQL_FIND_SESSION_BY_ID, params, sessionRowMapper());
    return rows.stream().findFirst();
  }

  @Override
  public List<WorkshopSessionView> findWorkshopSessions(UUID workshopId, boolean includeCanceled) {
    String sql = """
        SELECT w.id AS workshop_id, w.title, w.speaker, w.description, w.status AS workshop_status,
               w.created_by_user_id, w.created_at, w.updated_at, w.published_at, w.canceled_at,
               s.id AS session_id, s.workshop_id, s.room_id AS session_room_id, s.start_at, s.end_at, s.status AS session_status,
               s.seat_capacity, s.seats_confirmed, s.seats_reserved, s.fee_type, s.fee_amount, s.currency,
               s.created_at AS session_created_at, s.updated_at AS session_updated_at, s.canceled_at AS session_canceled_at,
               r.id AS room_id, r.name AS room_name, r.building, r.capacity AS room_capacity, r.map_url, r.status AS room_status,
               r.created_at AS room_created_at, r.updated_at AS room_updated_at
        FROM workshops w
        JOIN workshop_sessions s ON s.workshop_id = w.id
        JOIN rooms r ON r.id = s.room_id
        WHERE w.id = :workshopId
          AND (:includeCanceled = true OR s.status <> 'CANCELED')
        ORDER BY s.start_at
        """;

    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("workshopId", workshopId)
        .addValue("includeCanceled", includeCanceled);

    return jdbcTemplate.query(sql, params, workshopSessionViewRowMapper());
  }

  @Override
  public List<WorkshopSession> findSessionsByWorkshopId(UUID workshopId) {
    MapSqlParameterSource params = new MapSqlParameterSource("workshopId", workshopId);
    return jdbcTemplate.query(SQL_FIND_SESSIONS_BY_WORKSHOP_ID, params, sessionRowMapper());
  }

  @Override
  public Workshop save(Workshop workshop) {
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("id", workshop.id())
        .addValue("title", workshop.title())
        .addValue("speaker", workshop.speaker())
        .addValue("description", workshop.description())
        .addValue("status", workshop.status().name())
        .addValue("createdByUserId", workshop.createdByUserId())
        .addValue("createdAt", toTimestamp(workshop.createdAt()))
        .addValue("updatedAt", toTimestamp(workshop.updatedAt()))
        .addValue("publishedAt", toTimestamp(workshop.publishedAt()))
        .addValue("canceledAt", toTimestamp(workshop.canceledAt()));

    jdbcTemplate.update(SQL_INSERT_WORKSHOP, params);
    return workshop;
  }

  @Override
  public Workshop update(Workshop workshop) {
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("id", workshop.id())
        .addValue("title", workshop.title())
        .addValue("speaker", workshop.speaker())
        .addValue("description", workshop.description())
        .addValue("updatedAt", toTimestamp(workshop.updatedAt()));
    jdbcTemplate.update(SQL_UPDATE_WORKSHOP, params);
    return workshop;
  }

  @Override
  public WorkshopSession saveSession(WorkshopSession session) {
    MapSqlParameterSource params = sessionParams(session);
    jdbcTemplate.update(SQL_INSERT_SESSION, params);
    return session;
  }

  @Override
  public WorkshopSession updateSession(WorkshopSession session) {
    MapSqlParameterSource params = sessionParams(session);
    jdbcTemplate.update(SQL_UPDATE_SESSION, params);
    return session;
  }

  @Override
  public void updateWorkshopStatus(UUID workshopId, WorkshopStatus status, LocalDateTime publishedAt,
      LocalDateTime canceledAt) {
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("id", workshopId)
        .addValue("status", status.name())
        .addValue("publishedAt", toTimestamp(publishedAt))
        .addValue("canceledAt", toTimestamp(canceledAt))
        .addValue("updatedAt", toTimestamp(LocalDateTime.now()));
    jdbcTemplate.update(SQL_UPDATE_WORKSHOP_STATUS, params);
  }

  @Override
  public int cancelSessionsByWorkshopId(UUID workshopId, LocalDateTime canceledAt) {
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("workshopId", workshopId)
        .addValue("canceledAt", toTimestamp(canceledAt))
        .addValue("updatedAt", toTimestamp(LocalDateTime.now()));
    return jdbcTemplate.update(SQL_CANCEL_SESSIONS_BY_WORKSHOP_ID, params);
  }

  @Override
  public boolean existsRoomConflict(UUID roomId, LocalDateTime startAt, LocalDateTime endAt, UUID excludeSessionId) {
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("roomId", roomId)
        .addValue("startAt", toTimestamp(startAt))
        .addValue("endAt", toTimestamp(endAt))
        .addValue("excludeId", excludeSessionId);
    Integer count = jdbcTemplate.queryForObject(SQL_EXISTS_ROOM_CONFLICT, params, Integer.class);
    return count != null && count > 0;
  }

  private MapSqlParameterSource sessionParams(WorkshopSession session) {
    return new MapSqlParameterSource()
        .addValue("id", session.id())
        .addValue("workshopId", session.workshopId())
        .addValue("roomId", session.roomId())
        .addValue("startAt", toTimestamp(session.startAt()))
        .addValue("endAt", toTimestamp(session.endAt()))
        .addValue("status", session.status().name())
        .addValue("seatCapacity", session.seatCapacity())
        .addValue("seatsConfirmed", session.seatsConfirmed())
        .addValue("seatsReserved", session.seatsReserved())
        .addValue("feeType", session.feeType().name())
        .addValue("feeAmount", session.feeAmount())
        .addValue("currency", session.currency())
        .addValue("createdAt", toTimestamp(session.createdAt()))
        .addValue("updatedAt", toTimestamp(session.updatedAt()))
        .addValue("canceledAt", toTimestamp(session.canceledAt()));
  }

  private RowMapper<Workshop> workshopRowMapper() {
    return (rs, rowNum) -> new WorkshopJpaEntity(
        rs.getObject("id", UUID.class),
        rs.getString("title"),
        rs.getString("speaker"),
        rs.getString("description"),
        rs.getString("status"),
        rs.getObject("created_by_user_id", UUID.class),
        toLocalDateTime(rs.getTimestamp("created_at")),
        toLocalDateTime(rs.getTimestamp("updated_at")),
        toLocalDateTime(rs.getTimestamp("published_at")),
        toLocalDateTime(rs.getTimestamp("canceled_at"))).toDomain();
  }

  private RowMapper<WorkshopSession> sessionRowMapper() {
    return (rs, rowNum) -> new WorkshopSessionJpaEntity(
        rs.getObject("id", UUID.class),
        rs.getObject("workshop_id", UUID.class),
        rs.getObject("room_id", UUID.class),
        toLocalDateTime(rs.getTimestamp("start_at")),
        toLocalDateTime(rs.getTimestamp("end_at")),
        rs.getString("status"),
        rs.getInt("seat_capacity"),
        rs.getInt("seats_confirmed"),
        rs.getInt("seats_reserved"),
        rs.getString("fee_type"),
        rs.getBigDecimal("fee_amount"),
        rs.getString("currency"),
        toLocalDateTime(rs.getTimestamp("created_at")),
        toLocalDateTime(rs.getTimestamp("updated_at")),
        toLocalDateTime(rs.getTimestamp("canceled_at"))).toDomain();
  }

  private RowMapper<WorkshopSessionView> workshopSessionViewRowMapper() {
    return (rs, rowNum) -> {
      Workshop workshop = new WorkshopJpaEntity(
          rs.getObject("workshop_id", UUID.class),
          rs.getString("title"),
          rs.getString("speaker"),
          rs.getString("description"),
          rs.getString("workshop_status"),
          rs.getObject("created_by_user_id", UUID.class),
          toLocalDateTime(rs.getTimestamp("created_at")),
          toLocalDateTime(rs.getTimestamp("updated_at")),
          toLocalDateTime(rs.getTimestamp("published_at")),
          toLocalDateTime(rs.getTimestamp("canceled_at"))).toDomain();

      WorkshopSession session = new WorkshopSessionJpaEntity(
          rs.getObject("session_id", UUID.class),
          rs.getObject("workshop_id", UUID.class),
          rs.getObject("session_room_id", UUID.class),
          toLocalDateTime(rs.getTimestamp("start_at")),
          toLocalDateTime(rs.getTimestamp("end_at")),
          rs.getString("session_status"),
          rs.getInt("seat_capacity"),
          rs.getInt("seats_confirmed"),
          rs.getInt("seats_reserved"),
          rs.getString("fee_type"),
          rs.getBigDecimal("fee_amount"),
          rs.getString("currency"),
          toLocalDateTime(rs.getTimestamp("session_created_at")),
          toLocalDateTime(rs.getTimestamp("session_updated_at")),
          toLocalDateTime(rs.getTimestamp("session_canceled_at"))).toDomain();

      Room room = new Room(
          rs.getObject("room_id", UUID.class),
          rs.getString("room_name"),
          rs.getString("building"),
          rs.getInt("room_capacity"),
          rs.getString("map_url"),
          RoomStatus.valueOf(rs.getString("room_status")),
          toLocalDateTime(rs.getTimestamp("room_created_at")),
          toLocalDateTime(rs.getTimestamp("room_updated_at")));

      return new WorkshopSessionView(workshop, session, room);
    };
  }

  private QueryBundle buildPublishedQuery(
      String keyword,
      FeeType feeType,
      UUID roomId,
      LocalDateTime startAt,
      LocalDateTime endAt,
      Integer page,
      Integer size) {
    StringBuilder filter = new StringBuilder(" WHERE w.status = 'PUBLISHED' AND s.status <> 'CANCELED' ");
    MapSqlParameterSource params = new MapSqlParameterSource();

    if (keyword != null && !keyword.isBlank()) {
      filter.append(
          " AND (lower(w.title) LIKE :keyword OR lower(w.speaker) LIKE :keyword OR lower(w.description) LIKE :keyword) ");
      params.addValue("keyword", "%" + keyword.trim().toLowerCase() + "%");
    }

    if (feeType != null) {
      filter.append(" AND s.fee_type = :feeType ");
      params.addValue("feeType", feeType.name());
    }

    if (roomId != null) {
      filter.append(" AND s.room_id = :roomId ");
      params.addValue("roomId", roomId);
    }

    if (startAt != null && endAt != null) {
      filter.append(" AND s.start_at >= :startAt AND s.start_at < :endAt ");
      params.addValue("startAt", toTimestamp(startAt));
      params.addValue("endAt", toTimestamp(endAt));
    }

    String baseSelect = """
        SELECT w.id AS workshop_id, w.title, w.speaker, w.description, w.status AS workshop_status,
               w.created_by_user_id, w.created_at, w.updated_at, w.published_at, w.canceled_at,
           s.id AS session_id, s.workshop_id, s.room_id AS session_room_id, s.start_at, s.end_at, s.status AS session_status,
               s.seat_capacity, s.seats_confirmed, s.seats_reserved, s.fee_type, s.fee_amount, s.currency,
               s.created_at AS session_created_at, s.updated_at AS session_updated_at, s.canceled_at AS session_canceled_at,
               r.id AS room_id, r.name AS room_name, r.building, r.capacity AS room_capacity, r.map_url, r.status AS room_status,
               r.created_at AS room_created_at, r.updated_at AS room_updated_at
        FROM workshops w
        JOIN workshop_sessions s ON s.workshop_id = w.id
        JOIN rooms r ON r.id = s.room_id
        """;

    if (page != null && size != null) {
      int limit = Math.max(size, 1);
      int offset = Math.max(page, 0) * limit;
      params.addValue("limit", limit);
      params.addValue("offset", offset);

      String cte = """
          WITH filtered_workshops AS (
            SELECT DISTINCT w.id
            FROM workshops w
            JOIN workshop_sessions s ON s.workshop_id = w.id
          """ + filter + """
            ORDER BY w.id
            LIMIT :limit OFFSET :offset
          )
          """;

      String sql = cte + baseSelect + " JOIN filtered_workshops fw ON fw.id = w.id " + filter
          + " ORDER BY w.title, s.start_at";
      return new QueryBundle(sql, params);
    }

    String sql = baseSelect + filter + " ORDER BY w.title, s.start_at";
    return new QueryBundle(sql, params);
  }

  private Timestamp toTimestamp(LocalDateTime time) {
    return time == null ? null : Timestamp.valueOf(time);
  }

  private LocalDateTime toLocalDateTime(Timestamp timestamp) {
    return timestamp == null ? null : timestamp.toLocalDateTime();
  }

  private record QueryBundle(String sql, MapSqlParameterSource params) {
  }
}
