package com.unihub.application.workshop;

import com.unihub.application.workshop.exception.WorkshopException;
import com.unihub.domain.workshop.Workshop;
import com.unihub.domain.workshop.WorkshopErrorCode;
import com.unihub.domain.workshop.WorkshopRepository;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkshopStatsService {
  private final WorkshopRepository workshopRepository;
  private final NamedParameterJdbcTemplate jdbcTemplate;

  public WorkshopStatsService(
      WorkshopRepository workshopRepository,
      NamedParameterJdbcTemplate jdbcTemplate) {
    this.workshopRepository = workshopRepository;
    this.jdbcTemplate = jdbcTemplate;
  }

  @Transactional(readOnly = true)
  public WorkshopStatsResult getWorkshopStats(UUID workshopId) {
    Workshop workshop = workshopRepository.findById(workshopId)
        .orElseThrow(() -> new WorkshopException(WorkshopErrorCode.WORKSHOP_NOT_FOUND, HttpStatus.NOT_FOUND));

    List<WorkshopSessionStatsResult> sessions = findSessionStats(workshopId);
    int totalCapacity = sessions.stream().mapToInt(WorkshopSessionStatsResult::capacity).sum();
    int confirmedCount = sessions.stream().mapToInt(WorkshopSessionStatsResult::confirmedCount).sum();
    int reservedCount = sessions.stream().mapToInt(WorkshopSessionStatsResult::reservedCount).sum();
    int checkedInCount = sessions.stream().mapToInt(WorkshopSessionStatsResult::checkedInCount).sum();
    int remainingSeats = Math.max(0, totalCapacity - confirmedCount - reservedCount);

    return new WorkshopStatsResult(
        workshop.id(),
        workshop.title(),
        totalCapacity,
        confirmedCount,
        reservedCount,
        checkedInCount,
        remainingSeats,
        sessions);
  }

  private List<WorkshopSessionStatsResult> findSessionStats(UUID workshopId) {
    String sql = """
        SELECT s.id AS session_id,
               r.name AS room_name,
               r.building,
               s.start_at,
               s.end_at,
               s.seat_capacity,
               s.seats_confirmed,
               s.seats_reserved,
               s.status,
               COUNT(cr.id) AS checked_in_count
        FROM workshop_sessions s
        JOIN rooms r ON r.id = s.room_id
        LEFT JOIN checkin_records cr ON cr.session_id = s.id
        WHERE s.workshop_id = :workshopId
        GROUP BY s.id, r.name, r.building, s.start_at, s.end_at, s.seat_capacity,
                 s.seats_confirmed, s.seats_reserved, s.status
        ORDER BY s.start_at
        """;
    return jdbcTemplate.query(
        sql,
        new MapSqlParameterSource("workshopId", workshopId),
        (rs, rowNum) -> {
          int capacity = rs.getInt("seat_capacity");
          int confirmed = rs.getInt("seats_confirmed");
          int reserved = rs.getInt("seats_reserved");
          int remaining = Math.max(0, capacity - confirmed - reserved);
          return new WorkshopSessionStatsResult(
              rs.getObject("session_id", UUID.class),
              rs.getString("room_name"),
              rs.getString("building"),
              toLocalDateTime(rs.getTimestamp("start_at")),
              toLocalDateTime(rs.getTimestamp("end_at")),
              capacity,
              confirmed,
              reserved,
              rs.getInt("checked_in_count"),
              remaining,
              rs.getString("status"));
        });
  }

  private LocalDateTime toLocalDateTime(Timestamp timestamp) {
    return timestamp == null ? null : timestamp.toLocalDateTime();
  }
}
