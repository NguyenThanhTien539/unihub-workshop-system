package com.unihub.infrastructure.persistence.checkin;

import com.unihub.domain.checkin.CheckinCandidate;
import com.unihub.domain.checkin.CheckinRecord;
import com.unihub.domain.checkin.CheckinRepository;
import com.unihub.domain.registration.RegistrationStatus;
import com.unihub.domain.workshop.WorkshopSessionStatus;
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
public class CheckinRecordRepositoryAdapter implements CheckinRepository {
  private static final String SQL_FIND_CANDIDATE_BY_REGISTRATION_ID = """
      SELECT r.id AS registration_id,
             r.status AS registration_status,
             s.id AS session_id,
             s.status AS session_status,
             s.start_at,
             s.end_at,
             w.status AS workshop_status,
             u.full_name AS student_name,
             st.student_code
      FROM registrations r
      JOIN workshop_sessions s ON s.id = r.session_id
      JOIN workshops w ON w.id = s.workshop_id
      JOIN students st ON st.id = r.student_id
      LEFT JOIN users u ON u.id = st.user_id
      WHERE r.id = :registrationId
      LIMIT 1
      """;

  private static final String SQL_FIND_BY_REGISTRATION_ID = """
      SELECT id, registration_id, session_id, scanned_by_user_id, sync_event_id, source_mode,
             scanned_at, server_received_at, created_at
      FROM checkin_records
      WHERE registration_id = :registrationId
      LIMIT 1
      """;

  private static final String SQL_FIND_BY_SYNC_EVENT_ID = """
      SELECT id, registration_id, session_id, scanned_by_user_id, sync_event_id, source_mode,
             scanned_at, server_received_at, created_at
      FROM checkin_records
      WHERE sync_event_id = :syncEventId
      LIMIT 1
      """;

  private static final String SQL_INSERT = """
      INSERT INTO checkin_records (
        id, registration_id, session_id, scanned_by_user_id, sync_event_id, source_mode,
        scanned_at, server_received_at, created_at
      ) VALUES (
        :id, :registrationId, :sessionId, :scannedByUserId, :syncEventId, :sourceMode,
        :scannedAt, :serverReceivedAt, :createdAt
      )
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;

  public CheckinRecordRepositoryAdapter(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public Optional<CheckinCandidate> findCandidateByRegistrationId(UUID registrationId) {
    List<CheckinCandidate> rows = jdbcTemplate.query(SQL_FIND_CANDIDATE_BY_REGISTRATION_ID,
        new MapSqlParameterSource("registrationId", registrationId), candidateRowMapper());
    return rows.stream().findFirst();
  }

  @Override
  public Optional<CheckinRecord> findByRegistrationId(UUID registrationId) {
    List<CheckinRecord> rows = jdbcTemplate.query(SQL_FIND_BY_REGISTRATION_ID,
        new MapSqlParameterSource("registrationId", registrationId), recordRowMapper());
    return rows.stream().findFirst();
  }

  @Override
  public Optional<CheckinRecord> findBySyncEventId(String syncEventId) {
    List<CheckinRecord> rows = jdbcTemplate.query(SQL_FIND_BY_SYNC_EVENT_ID,
        new MapSqlParameterSource("syncEventId", syncEventId), recordRowMapper());
    return rows.stream().findFirst();
  }

  @Override
  public CheckinRecord save(CheckinRecord checkinRecord) {
    jdbcTemplate.update(SQL_INSERT, params(checkinRecord));
    return checkinRecord;
  }

  private MapSqlParameterSource params(CheckinRecord checkinRecord) {
    return new MapSqlParameterSource()
        .addValue("id", checkinRecord.id())
        .addValue("registrationId", checkinRecord.registrationId())
        .addValue("sessionId", checkinRecord.sessionId())
        .addValue("scannedByUserId", checkinRecord.scannedByUserId())
        .addValue("syncEventId", checkinRecord.syncEventId())
        .addValue("sourceMode", checkinRecord.sourceMode().name())
        .addValue("scannedAt", toTimestamp(checkinRecord.scannedAt()))
        .addValue("serverReceivedAt", toTimestamp(checkinRecord.serverReceivedAt()))
        .addValue("createdAt", toTimestamp(checkinRecord.createdAt()));
  }

  private RowMapper<CheckinCandidate> candidateRowMapper() {
    return (rs, rowNum) -> new CheckinCandidate(
        rs.getObject("registration_id", UUID.class),
        RegistrationStatus.valueOf(rs.getString("registration_status")),
        rs.getObject("session_id", UUID.class),
        WorkshopStatus.valueOf(rs.getString("workshop_status")),
        WorkshopSessionStatus.valueOf(rs.getString("session_status")),
        toLocalDateTime(rs.getTimestamp("start_at")),
        toLocalDateTime(rs.getTimestamp("end_at")),
        rs.getString("student_name"),
        rs.getString("student_code"));
  }

  private RowMapper<CheckinRecord> recordRowMapper() {
    return (rs, rowNum) -> new CheckinRecordEntity(
        rs.getObject("id", UUID.class),
        rs.getObject("registration_id", UUID.class),
        rs.getObject("session_id", UUID.class),
        rs.getObject("scanned_by_user_id", UUID.class),
        rs.getString("sync_event_id"),
        rs.getString("source_mode"),
        toLocalDateTime(rs.getTimestamp("scanned_at")),
        toLocalDateTime(rs.getTimestamp("server_received_at")),
        toLocalDateTime(rs.getTimestamp("created_at"))).toDomain();
  }

  private Timestamp toTimestamp(LocalDateTime value) {
    return value == null ? null : Timestamp.valueOf(value);
  }

  private LocalDateTime toLocalDateTime(Timestamp value) {
    return value == null ? null : value.toLocalDateTime();
  }
}
