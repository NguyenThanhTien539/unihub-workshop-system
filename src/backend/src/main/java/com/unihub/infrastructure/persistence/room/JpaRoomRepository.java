package com.unihub.infrastructure.persistence.room;

import com.unihub.domain.room.Room;
import com.unihub.domain.room.RoomRepository;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JpaRoomRepository implements RoomRepository {
  private static final String SQL_FIND_BY_ID = """
      SELECT id, name, building, capacity, map_url, status, created_at, updated_at
      FROM rooms
      WHERE id = :id
      LIMIT 1
      """;

  private static final String SQL_FIND_ALL_ACTIVE = """
      SELECT id, name, building, capacity, map_url, status, created_at, updated_at
      FROM rooms
      WHERE status = 'ACTIVE'
      ORDER BY building, name
      """;

  private static final String SQL_FIND_ALL = """
      SELECT id, name, building, capacity, map_url, status, created_at, updated_at
      FROM rooms
      ORDER BY building, name
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;

  public JpaRoomRepository(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public Optional<Room> findById(UUID roomId) {
    MapSqlParameterSource params = new MapSqlParameterSource("id", roomId);
    List<Room> rooms = jdbcTemplate.query(SQL_FIND_BY_ID, params, roomRowMapper());
    return rooms.stream().findFirst();
  }

  @Override
  public List<Room> findAll(boolean includeInactive) {
    String sql = includeInactive ? SQL_FIND_ALL : SQL_FIND_ALL_ACTIVE;
    return jdbcTemplate.query(sql, new MapSqlParameterSource(), roomRowMapper());
  }

  private RowMapper<Room> roomRowMapper() {
    return (rs, rowNum) -> new RoomJpaEntity(
        rs.getObject("id", UUID.class),
        rs.getString("name"),
        rs.getString("building"),
        rs.getInt("capacity"),
        rs.getString("map_url"),
        rs.getString("status"),
        toLocalDateTime(rs.getTimestamp("created_at")),
        toLocalDateTime(rs.getTimestamp("updated_at"))).toDomain();
  }

  private java.time.LocalDateTime toLocalDateTime(Timestamp timestamp) {
    return timestamp == null ? null : timestamp.toLocalDateTime();
  }
}
