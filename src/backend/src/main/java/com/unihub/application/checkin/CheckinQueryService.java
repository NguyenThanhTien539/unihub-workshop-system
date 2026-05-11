package com.unihub.application.checkin;

import com.unihub.presentation.dto.response.checkin.CheckinHistoryResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

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

  private final NamedParameterJdbcTemplate jdbcTemplate;

  public CheckinQueryService(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public List<CheckinHistoryResponse> listHistoryForStaff(UUID staffUserId) {
    MapSqlParameterSource params = new MapSqlParameterSource("staffUserId", staffUserId);
    return jdbcTemplate.query(SQL_FIND_HISTORY_BY_STAFF, params, historyRowMapper());
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
