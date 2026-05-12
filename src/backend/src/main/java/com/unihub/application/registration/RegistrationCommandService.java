package com.unihub.application.registration;

import com.unihub.application.registration.exception.RegistrationException;
import com.unihub.domain.registration.RegistrationErrorCode;
import com.unihub.domain.student.Student;
import com.unihub.domain.student.StudentRepository;
import com.unihub.presentation.dto.response.registration.RegistrationResponse;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrationCommandService {
  private static final String SQL_FIND_SESSION_FOR_REGISTRATION = """
      SELECT
        ws.id,
        ws.status AS session_status,
        ws.seat_capacity,
        ws.seats_confirmed,
        ws.seats_reserved,
        ws.fee_type,
        ws.fee_amount,
        ws.currency,
        w.status AS workshop_status
      FROM workshop_sessions ws
      JOIN workshops w ON w.id = ws.workshop_id
      WHERE ws.id = :sessionId
      FOR UPDATE
      """;

  private static final String SQL_FIND_ACTIVE_REGISTRATION = """
      SELECT id
      FROM registrations
      WHERE student_id = :studentId
        AND session_id = :sessionId
        AND status IN ('PENDING_PAYMENT', 'CONFIRMED')
      LIMIT 1
      """;

  private static final String SQL_INSERT_REGISTRATION = """
      INSERT INTO registrations (
        id, student_id, session_id, status, registration_type,
        reserved_at, confirmed_at, expires_at, created_at, updated_at
      )
      VALUES (
        :id, :studentId, :sessionId, :status, :registrationType,
        :reservedAt, :confirmedAt, :expiresAt, :now, :now
      )
      """;

  private static final String SQL_UPDATE_SESSION_SEATS = """
      UPDATE workshop_sessions
      SET seats_confirmed = seats_confirmed + :confirmedDelta,
          seats_reserved = seats_reserved + :reservedDelta,
          status = CASE
            WHEN seat_capacity <= seats_confirmed + seats_reserved + :confirmedDelta + :reservedDelta THEN 'FULL'
            ELSE status
          END,
          updated_at = :now
      WHERE id = :sessionId
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;
  private final StudentRepository studentRepository;
  private final RegistrationQueryService registrationQueryService;

  public RegistrationCommandService(
      NamedParameterJdbcTemplate jdbcTemplate,
      StudentRepository studentRepository,
      RegistrationQueryService registrationQueryService) {
    this.jdbcTemplate = jdbcTemplate;
    this.studentRepository = studentRepository;
    this.registrationQueryService = registrationQueryService;
  }

  @Transactional
  public RegistrationResponse register(UUID userId, UUID sessionId) {
    Student student = studentRepository.findByUserId(userId)
        .orElseThrow(() -> new RegistrationException(
            RegistrationErrorCode.STUDENT_PROFILE_NOT_FOUND,
            HttpStatus.NOT_FOUND));

    UUID existingId = findActiveRegistrationId(student.id(), sessionId);
    if (existingId != null) {
      return registrationQueryService.getRegistration(existingId);
    }

    SessionForRegistration session = findSession(sessionId);
    validateSession(session);

    LocalDateTime now = LocalDateTime.now();
    UUID registrationId = UUID.randomUUID();
    boolean paid = "PAID".equals(session.feeType());
    String status = paid ? "PENDING_PAYMENT" : "CONFIRMED";

    MapSqlParameterSource insertParams = new MapSqlParameterSource()
        .addValue("id", registrationId)
        .addValue("studentId", student.id())
        .addValue("sessionId", sessionId)
        .addValue("status", status)
        .addValue("registrationType", session.feeType())
        .addValue("reservedAt", paid ? Timestamp.valueOf(now) : null)
        .addValue("confirmedAt", paid ? null : Timestamp.valueOf(now))
        .addValue("expiresAt", paid ? Timestamp.valueOf(now.plusMinutes(15)) : null)
        .addValue("now", Timestamp.valueOf(now));
    jdbcTemplate.update(SQL_INSERT_REGISTRATION, insertParams);

    MapSqlParameterSource updateParams = new MapSqlParameterSource()
        .addValue("sessionId", sessionId)
        .addValue("confirmedDelta", paid ? 0 : 1)
        .addValue("reservedDelta", paid ? 1 : 0)
        .addValue("now", Timestamp.valueOf(now));
    jdbcTemplate.update(SQL_UPDATE_SESSION_SEATS, updateParams);

    return registrationQueryService.getRegistration(registrationId);
  }

  private UUID findActiveRegistrationId(UUID studentId, UUID sessionId) {
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("studentId", studentId)
        .addValue("sessionId", sessionId);
    List<UUID> rows = jdbcTemplate.query(
        SQL_FIND_ACTIVE_REGISTRATION,
        params,
        (rs, rowNum) -> rs.getObject("id", UUID.class));
    return rows.stream().findFirst().orElse(null);
  }

  private SessionForRegistration findSession(UUID sessionId) {
    MapSqlParameterSource params = new MapSqlParameterSource("sessionId", sessionId);
    List<SessionForRegistration> rows = jdbcTemplate.query(
        SQL_FIND_SESSION_FOR_REGISTRATION,
        params,
        sessionRowMapper());
    return rows.stream()
        .findFirst()
        .orElseThrow(() -> new RegistrationException(
            RegistrationErrorCode.WORKSHOP_SESSION_NOT_FOUND,
            HttpStatus.NOT_FOUND));
  }

  private void validateSession(SessionForRegistration session) {
    if (!"PUBLISHED".equals(session.workshopStatus())) {
      throw new RegistrationException(RegistrationErrorCode.WORKSHOP_NOT_AVAILABLE, HttpStatus.CONFLICT);
    }
    if (!"OPEN".equals(session.sessionStatus())) {
      throw new RegistrationException(RegistrationErrorCode.WORKSHOP_SESSION_NOT_OPEN, HttpStatus.CONFLICT);
    }
    if (session.seatCapacity() <= session.seatsConfirmed() + session.seatsReserved()) {
      throw new RegistrationException(RegistrationErrorCode.WORKSHOP_SESSION_FULL, HttpStatus.CONFLICT);
    }
  }

  private RowMapper<SessionForRegistration> sessionRowMapper() {
    return (rs, rowNum) -> new SessionForRegistration(
        rs.getObject("id", UUID.class),
        rs.getString("session_status"),
        rs.getInt("seat_capacity"),
        rs.getInt("seats_confirmed"),
        rs.getInt("seats_reserved"),
        rs.getString("fee_type"),
        rs.getBigDecimal("fee_amount"),
        rs.getString("currency"),
        rs.getString("workshop_status"));
  }

  private record SessionForRegistration(
      UUID id,
      String sessionStatus,
      int seatCapacity,
      int seatsConfirmed,
      int seatsReserved,
      String feeType,
      BigDecimal feeAmount,
      String currency,
      String workshopStatus) {
  }
}
