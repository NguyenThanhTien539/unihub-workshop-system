package com.unihub.infrastructure.persistence.registration;

import com.unihub.domain.payment.PaymentStatus;
import com.unihub.domain.registration.Registration;
import com.unihub.domain.registration.RegistrationEmailView;
import com.unihub.domain.registration.RegistrationRepository;
import com.unihub.domain.registration.RegistrationSessionSnapshot;
import com.unihub.domain.registration.RegistrationStatus;
import com.unihub.domain.registration.RegistrationType;
import com.unihub.domain.registration.RegistrationView;
import com.unihub.domain.workshop.FeeType;
import com.unihub.domain.workshop.WorkshopSessionStatus;
import com.unihub.domain.workshop.WorkshopStatus;
import java.math.BigDecimal;
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
public class  RegistrationRepositoryAdapter implements RegistrationRepository {
  private static final String SQL_FIND_BY_ID = """
      SELECT id, student_id, session_id, status, registration_type, reserved_at, confirmed_at,
             expires_at, canceled_at, created_at, updated_at
      FROM registrations
      WHERE id = :id
      LIMIT 1
      """;

  private static final String SQL_FIND_ACTIVE_BY_STUDENT_AND_SESSION = """
      SELECT id, student_id, session_id, status, registration_type, reserved_at, confirmed_at,
             expires_at, canceled_at, created_at, updated_at
      FROM registrations
      WHERE student_id = :studentId
        AND session_id = :sessionId
        AND status IN ('PENDING_PAYMENT', 'CONFIRMED')
      LIMIT 1
      """;

  private static final String SQL_LOCK_SESSION = """
      SELECT w.id AS workshop_id,
             w.title AS workshop_title,
             w.status AS workshop_status,
             s.id AS session_id,
             s.status AS session_status,
             s.room_id,
             r.name AS room_name,
             r.building,
             s.start_at,
             s.end_at,
             s.seat_capacity,
             s.seats_confirmed,
             s.seats_reserved,
             s.fee_type,
             s.fee_amount,
             s.currency
      FROM workshop_sessions s
      JOIN workshops w ON w.id = s.workshop_id
      JOIN rooms r ON r.id = s.room_id
      WHERE s.id = :sessionId
      FOR UPDATE OF s
      """;

  private static final String SQL_INSERT = """
      INSERT INTO registrations (
        id, student_id, session_id, status, registration_type, reserved_at, confirmed_at,
        expires_at, canceled_at, created_at, updated_at
      ) VALUES (
        :id, :studentId, :sessionId, :status, :registrationType, :reservedAt, :confirmedAt,
        :expiresAt, :canceledAt, :createdAt, :updatedAt
      )
      """;

  private static final String SQL_UPDATE = """
      UPDATE registrations
      SET status = :status,
          reserved_at = :reservedAt,
          confirmed_at = :confirmedAt,
          expires_at = :expiresAt,
          canceled_at = :canceledAt,
          updated_at = :updatedAt
      WHERE id = :id
      """;

  private static final String SQL_UPDATE_SESSION_SEATS = """
      UPDATE workshop_sessions
      SET seats_confirmed = seats_confirmed + :confirmedDelta,
          seats_reserved = seats_reserved + :reservedDelta,
          updated_at = :updatedAt
      WHERE id = :sessionId
      """;

  private static final String SQL_FIND_VIEWS_BASE = """
      SELECT r.id AS registration_id,
             r.student_id,
             w.id AS workshop_id,
             w.title AS workshop_title,
             s.id AS session_id,
             room.name AS room_name,
             room.building,
             s.start_at,
             s.end_at,
             r.status AS registration_status,
             r.registration_type,
             p.id AS payment_intent_id,
             p.status AS payment_status,
             p.amount,
             p.currency,
             p.expires_at AS payment_expires_at,
             q.id AS qr_ticket_id,
             q.status AS qr_status,
             r.created_at,
             r.confirmed_at
      FROM registrations r
      JOIN workshop_sessions s ON s.id = r.session_id
      JOIN workshops w ON w.id = s.workshop_id
      JOIN rooms room ON room.id = s.room_id
      LEFT JOIN payment_intents p ON p.registration_id = r.id
      LEFT JOIN qr_tickets q ON q.registration_id = r.id
      """;

  private static final String SQL_FIND_VIEWS_BY_STUDENT = SQL_FIND_VIEWS_BASE + """
      WHERE r.student_id = :studentId
      ORDER BY r.created_at DESC
      """;

  private static final String SQL_FIND_VIEW_BY_ID_FOR_STUDENT = SQL_FIND_VIEWS_BASE + """
      WHERE r.student_id = :studentId
        AND r.id = :registrationId
      ORDER BY r.created_at DESC
      """;

  private static final String SQL_FIND_EMAIL_VIEW = """
      SELECT r.id AS registration_id,
             u.id AS recipient_user_id,
             u.email AS recipient_email,
             u.full_name AS recipient_name,
             w.id AS workshop_id,
             w.title AS workshop_title,
             room.name AS room_name,
             room.building,
             s.start_at,
             s.end_at
      FROM registrations r
      JOIN students st ON st.id = r.student_id
      JOIN users u ON u.id = st.user_id
      JOIN workshop_sessions s ON s.id = r.session_id
      JOIN workshops w ON w.id = s.workshop_id
      JOIN rooms room ON room.id = s.room_id
      WHERE r.id = :registrationId
      LIMIT 1
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;

  public RegistrationRepositoryAdapter(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public Optional<Registration> findById(UUID registrationId) {
    List<Registration> rows = jdbcTemplate.query(SQL_FIND_BY_ID,
        new MapSqlParameterSource("id", registrationId), registrationRowMapper());
    return rows.stream().findFirst();
  }

  @Override
  public Optional<Registration> findActiveByStudentAndSession(UUID studentId, UUID sessionId) {
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("studentId", studentId)
        .addValue("sessionId", sessionId);
    List<Registration> rows = jdbcTemplate.query(SQL_FIND_ACTIVE_BY_STUDENT_AND_SESSION, params, registrationRowMapper());
    return rows.stream().findFirst();
  }

  @Override
  public RegistrationSessionSnapshot lockSessionForRegistration(UUID sessionId) {
    return jdbcTemplate.query(SQL_LOCK_SESSION,
        new MapSqlParameterSource("sessionId", sessionId),
        rs -> rs.next() ? sessionSnapshotRowMapper().mapRow(rs, 1) : null);
  }

  @Override
  public Registration save(Registration registration) {
    jdbcTemplate.update(SQL_INSERT, registrationParams(registration));
    return registration;
  }

  @Override
  public Registration update(Registration registration) {
    jdbcTemplate.update(SQL_UPDATE, registrationParams(registration));
    return registration;
  }

  @Override
  public void updateSessionSeatCounters(UUID sessionId, int seatsConfirmedDelta, int seatsReservedDelta) {
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("sessionId", sessionId)
        .addValue("confirmedDelta", seatsConfirmedDelta)
        .addValue("reservedDelta", seatsReservedDelta)
        .addValue("updatedAt", Timestamp.valueOf(LocalDateTime.now()));
    jdbcTemplate.update(SQL_UPDATE_SESSION_SEATS, params);
  }

  @Override
  public List<RegistrationView> findViewsByStudentId(UUID studentId) {
    return jdbcTemplate.query(SQL_FIND_VIEWS_BY_STUDENT,
        new MapSqlParameterSource("studentId", studentId), registrationViewRowMapper());
  }

  @Override
  public Optional<RegistrationView> findViewByIdForStudent(UUID registrationId, UUID studentId) {
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("studentId", studentId)
        .addValue("registrationId", registrationId);
    List<RegistrationView> rows = jdbcTemplate.query(SQL_FIND_VIEW_BY_ID_FOR_STUDENT, params, registrationViewRowMapper());
    return rows.stream().findFirst();
  }

  @Override
  public Optional<RegistrationEmailView> findEmailViewByRegistrationId(UUID registrationId) {
    List<RegistrationEmailView> rows = jdbcTemplate.query(SQL_FIND_EMAIL_VIEW,
        new MapSqlParameterSource("registrationId", registrationId), emailViewRowMapper());
    return rows.stream().findFirst();
  }

  private MapSqlParameterSource registrationParams(Registration registration) {
    return new MapSqlParameterSource()
        .addValue("id", registration.id())
        .addValue("studentId", registration.studentId())
        .addValue("sessionId", registration.sessionId())
        .addValue("status", registration.status().name())
        .addValue("registrationType", registration.registrationType().name())
        .addValue("reservedAt", toTimestamp(registration.reservedAt()))
        .addValue("confirmedAt", toTimestamp(registration.confirmedAt()))
        .addValue("expiresAt", toTimestamp(registration.expiresAt()))
        .addValue("canceledAt", toTimestamp(registration.canceledAt()))
        .addValue("createdAt", toTimestamp(registration.createdAt()))
        .addValue("updatedAt", toTimestamp(registration.updatedAt()));
  }

  private RowMapper<Registration> registrationRowMapper() {
    return (rs, rowNum) -> new Registration(
        rs.getObject("id", UUID.class),
        rs.getObject("student_id", UUID.class),
        rs.getObject("session_id", UUID.class),
        RegistrationStatus.valueOf(rs.getString("status")),
        RegistrationType.valueOf(rs.getString("registration_type")),
        toLocalDateTime(rs.getTimestamp("reserved_at")),
        toLocalDateTime(rs.getTimestamp("confirmed_at")),
        toLocalDateTime(rs.getTimestamp("expires_at")),
        toLocalDateTime(rs.getTimestamp("canceled_at")),
        toLocalDateTime(rs.getTimestamp("created_at")),
        toLocalDateTime(rs.getTimestamp("updated_at")));
  }

  private RowMapper<RegistrationSessionSnapshot> sessionSnapshotRowMapper() {
    return (rs, rowNum) -> new RegistrationSessionSnapshot(
        rs.getObject("workshop_id", UUID.class),
        rs.getString("workshop_title"),
        WorkshopStatus.valueOf(rs.getString("workshop_status")),
        rs.getObject("session_id", UUID.class),
        WorkshopSessionStatus.valueOf(rs.getString("session_status")),
        rs.getObject("room_id", UUID.class),
        rs.getString("room_name"),
        rs.getString("building"),
        toLocalDateTime(rs.getTimestamp("start_at")),
        toLocalDateTime(rs.getTimestamp("end_at")),
        rs.getInt("seat_capacity"),
        rs.getInt("seats_confirmed"),
        rs.getInt("seats_reserved"),
        FeeType.valueOf(rs.getString("fee_type")),
        rs.getBigDecimal("fee_amount"),
        rs.getString("currency"));
  }

  private RowMapper<RegistrationView> registrationViewRowMapper() {
    return (rs, rowNum) -> new RegistrationView(
        rs.getObject("registration_id", UUID.class),
        rs.getObject("student_id", UUID.class),
        rs.getObject("workshop_id", UUID.class),
        rs.getString("workshop_title"),
        rs.getObject("session_id", UUID.class),
        rs.getString("room_name"),
        rs.getString("building"),
        toLocalDateTime(rs.getTimestamp("start_at")),
        toLocalDateTime(rs.getTimestamp("end_at")),
        RegistrationStatus.valueOf(rs.getString("registration_status")),
        RegistrationType.valueOf(rs.getString("registration_type")),
        rs.getObject("payment_intent_id", UUID.class),
        mapPaymentStatus(rs.getString("payment_status")),
        rs.getBigDecimal("amount"),
        rs.getString("currency"),
        toLocalDateTime(rs.getTimestamp("payment_expires_at")),
        rs.getObject("qr_ticket_id", UUID.class),
        rs.getObject("qr_ticket_id") != null && "ACTIVE".equals(rs.getString("qr_status")),
        toLocalDateTime(rs.getTimestamp("created_at")),
        toLocalDateTime(rs.getTimestamp("confirmed_at")));
  }

  private RowMapper<RegistrationEmailView> emailViewRowMapper() {
    return (rs, rowNum) -> new RegistrationEmailView(
        rs.getObject("registration_id", UUID.class),
        rs.getObject("recipient_user_id", UUID.class),
        rs.getString("recipient_email"),
        rs.getString("recipient_name"),
        rs.getObject("workshop_id", UUID.class),
        rs.getString("workshop_title"),
        rs.getString("room_name"),
        rs.getString("building"),
        toLocalDateTime(rs.getTimestamp("start_at")),
        toLocalDateTime(rs.getTimestamp("end_at")));
  }

  private PaymentStatus mapPaymentStatus(String status) {
    return status == null ? null : PaymentStatus.valueOf(status);
  }

  private Timestamp toTimestamp(LocalDateTime value) {
    return value == null ? null : Timestamp.valueOf(value);
  }

  private LocalDateTime toLocalDateTime(Timestamp value) {
    return value == null ? null : value.toLocalDateTime();
  }
}
