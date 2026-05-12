package com.unihub.application.registration;

import com.unihub.domain.student.Student;
import com.unihub.domain.student.StudentRepository;
import com.unihub.presentation.dto.response.registration.RegistrationResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class RegistrationQueryService {
  private static final String SQL_FIND_BY_USER_ID = """
      SELECT
        r.id,
        w.id AS workshop_id,
        w.title AS workshop_title,
        r.status,
        ws.start_at,
        ws.end_at
      FROM registrations r
      JOIN workshop_sessions ws ON ws.id = r.session_id
      JOIN workshops w ON w.id = ws.workshop_id
      WHERE r.student_id = :studentId
      ORDER BY COALESCE(r.confirmed_at, r.reserved_at, r.created_at) DESC
      """;

  private static final String SQL_FIND_BY_ID = """
      SELECT
        r.id,
        w.id AS workshop_id,
        w.title AS workshop_title,
        r.status,
        ws.start_at,
        ws.end_at
      FROM registrations r
      JOIN workshop_sessions ws ON ws.id = r.session_id
      JOIN workshops w ON w.id = ws.workshop_id
      WHERE r.id = :registrationId
      LIMIT 1
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;
  private final StudentRepository studentRepository;

  public RegistrationQueryService(
      NamedParameterJdbcTemplate jdbcTemplate,
      StudentRepository studentRepository) {
    this.jdbcTemplate = jdbcTemplate;
    this.studentRepository = studentRepository;
  }

  public List<RegistrationResponse> listForUser(UUID userId) {
    return studentRepository.findByUserId(userId)
        .map(this::listForStudent)
        .orElseGet(List::of);
  }

  public RegistrationResponse getRegistration(UUID registrationId) {
    MapSqlParameterSource params = new MapSqlParameterSource("registrationId", registrationId);
    return jdbcTemplate.query(SQL_FIND_BY_ID, params, registrationRowMapper())
        .stream()
        .findFirst()
        .orElseThrow();
  }

  private List<RegistrationResponse> listForStudent(Student student) {
    MapSqlParameterSource params = new MapSqlParameterSource("studentId", student.id());
    return jdbcTemplate.query(SQL_FIND_BY_USER_ID, params, registrationRowMapper());
  }

  private RowMapper<RegistrationResponse> registrationRowMapper() {
    return (rs, rowNum) -> {
      String status = rs.getString("status");
      String title = rs.getString("workshop_title");
      return new RegistrationResponse(
          rs.getObject("id", UUID.class),
          rs.getObject("workshop_id", UUID.class),
          title,
          status,
          null,
          registrationMessage(status, title),
          registrationNotification(status));
    };
  }

  private String registrationMessage(String status, String workshopTitle) {
    return switch (status) {
      case "CONFIRMED" -> "Your registration for " + workshopTitle + " is confirmed.";
      case "PENDING_PAYMENT" -> "Complete payment to confirm your registration.";
      case "PAYMENT_FAILED" -> "Payment failed. Please try registering again.";
      case "EXPIRED" -> "This registration expired before it was confirmed.";
      case "CANCELED" -> "This registration was cancelled.";
      default -> "Registration status: " + status;
    };
  }

  private String registrationNotification(String status) {
    return switch (status) {
      case "CONFIRMED" -> "Show this ticket at check-in.";
      case "PENDING_PAYMENT" -> "Your seat is reserved until the payment window expires.";
      case "PAYMENT_FAILED" -> "No ticket was issued for this registration.";
      case "EXPIRED", "CANCELED" -> "This registration is no longer active.";
      default -> "Check the latest registration status before attending.";
    };
  }
}
