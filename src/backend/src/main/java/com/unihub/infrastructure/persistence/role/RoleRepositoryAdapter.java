package com.unihub.infrastructure.persistence.role;

import com.unihub.domain.role.RoleRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RoleRepositoryAdapter implements RoleRepository {
  private static final String SQL_FIND_ROLE_NAMES_BY_USER_ID = """
      SELECT r.name
      FROM roles r
      INNER JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = :userId
      ORDER BY r.name
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;

  public RoleRepositoryAdapter(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public List<String> findRoleNamesByUserId(UUID userId) {
    MapSqlParameterSource params = new MapSqlParameterSource("userId", userId);
    return jdbcTemplate.query(SQL_FIND_ROLE_NAMES_BY_USER_ID, params, (rs, rowNum) -> rs.getString("name"));
  }
}
