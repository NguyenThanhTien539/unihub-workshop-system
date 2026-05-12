package com.unihub.application.checkin;

import com.unihub.domain.workshop.WorkshopRepository;
import com.unihub.domain.workshop.WorkshopSession;
import com.unihub.domain.workshop.WorkshopSessionStatus;
import com.unihub.domain.workshop.WorkshopSessionView;
import com.unihub.presentation.dto.response.checkin.CheckinHistoryResponse;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CheckinQueryService {
  private static final String SQL_FIND_HISTORY_BY_STAFF = """
      SELECT
        cr.id,
        s.full_name AS student_name,
        s.student_code,
        w.title AS workshop_title,
        cr.scanned_at,
        cr.source_mode
      FROM checkin_records cr
      JOIN registrations r ON r.id = cr.registration_id
      JOIN students s ON s.id = r.student_id
      JOIN workshop_sessions ws ON ws.id = cr.session_id
      JOIN workshops w ON w.id = ws.workshop_id
      WHERE cr.scanned_by_user_id = :staffUserId
      ORDER BY cr.scanned_at DESC
      """;

  private final WorkshopRepository workshopRepository;
  private final NamedParameterJdbcTemplate jdbcTemplate;
  private final Clock clock;

  public CheckinQueryService(
      WorkshopRepository workshopRepository,
      NamedParameterJdbcTemplate jdbcTemplate,
      Clock clock) {
    this.workshopRepository = workshopRepository;
    this.jdbcTemplate = jdbcTemplate;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<CheckinSessionResult> getSessions() {
    LocalDateTime now = LocalDateTime.now(clock);
    return workshopRepository.findPublishedWorkshopSessions(null, null, null, null, null, null, null).stream()
        .sorted(Comparator.comparing(view -> view.session().startAt()))
        .map(view -> toSessionResult(view, now))
        .toList();
  }

  @Transactional(readOnly = true)
  public List<CheckinHistoryResponse> listHistoryForStaff(UUID staffUserId) {
    MapSqlParameterSource params = new MapSqlParameterSource("staffUserId", staffUserId);
    return jdbcTemplate.query(SQL_FIND_HISTORY_BY_STAFF, params, historyRowMapper());
  }

  private CheckinSessionResult toSessionResult(WorkshopSessionView view, LocalDateTime now) {
    WorkshopSession session = view.session();
    return new CheckinSessionResult(
        session.id(),
        view.workshop().title(),
        view.room().name(),
        view.room().building(),
        session.startAt(),
        session.endAt(),
        isCheckinOpen(session.status(), session.startAt(), session.endAt(), now));
  }

  private boolean isCheckinOpen(
      WorkshopSessionStatus status,
      LocalDateTime startAt,
      LocalDateTime endAt,
      LocalDateTime eventTime) {
    boolean allowedStatus = status == WorkshopSessionStatus.OPEN || status == WorkshopSessionStatus.FULL;
    return allowedStatus && !eventTime.isBefore(startAt) && !eventTime.isAfter(endAt);
  }

  private RowMapper<CheckinHistoryResponse> historyRowMapper() {
    return (rs, rowNum) -> new CheckinHistoryResponse(
        rs.getObject("id", UUID.class),
        rs.getString("student_name"),
        rs.getString("student_code"),
        rs.getString("workshop_title"),
        rs.getTimestamp("scanned_at").toLocalDateTime(),
        "OFFLINE_SYNC".equals(rs.getString("source_mode")) ? "OFFLINE_SYNCED" : "VALID");
  }
}
