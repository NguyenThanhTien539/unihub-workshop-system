package com.unihub.infrastructure.persistence.user;

import com.unihub.domain.user.User;
import com.unihub.domain.user.UserRepository;
import com.unihub.domain.user.UserStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepositoryAdapter implements UserRepository {
  private static final String SQL_FIND_BY_EMAIL = """
      SELECT id, email, password_hash, full_name, account_status
      FROM users
      WHERE lower(email) = lower(:email)
      LIMIT 1
      """;

  private static final String SQL_FIND_BY_ID = """
      SELECT id, email, password_hash, full_name, account_status
      FROM users
      WHERE id = :id
      LIMIT 1
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;

  public UserRepositoryAdapter(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public Optional<User> findByEmail(String email) {
    MapSqlParameterSource params = new MapSqlParameterSource("email", email);
    List<User> rows = jdbcTemplate.query(SQL_FIND_BY_EMAIL, params, userRowMapper());
    return rows.stream().findFirst();
  }

  @Override
  public Optional<User> findById(UUID id) {
    MapSqlParameterSource params = new MapSqlParameterSource("id", id);
    List<User> rows = jdbcTemplate.query(SQL_FIND_BY_ID, params, userRowMapper());
    return rows.stream().findFirst();
  }

  private RowMapper<User> userRowMapper() {
    return (rs, rowNum) -> new User(
        rs.getObject("id", UUID.class),
        rs.getString("email"),
        rs.getString("password_hash"),
        rs.getString("full_name"),
        UserStatus.valueOf(rs.getString("account_status"))
    );
  }
}
