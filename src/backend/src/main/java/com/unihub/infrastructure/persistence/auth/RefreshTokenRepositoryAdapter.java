package com.unihub.infrastructure.persistence.auth;

import com.unihub.domain.auth.RefreshToken;
import com.unihub.domain.auth.RefreshTokenRepository;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class RefreshTokenRepositoryAdapter implements RefreshTokenRepository {
  private static final String SQL_FIND_BY_TOKEN_HASH = """
      SELECT id, user_id, token_hash, expires_at, revoked_at, created_at, replaced_by_token_id
      FROM refresh_tokens
      WHERE token_hash = :tokenHash
      LIMIT 1
      """;

  private static final String SQL_FIND_BY_TOKEN_HASH_FOR_UPDATE = """
      SELECT id, user_id, token_hash, expires_at, revoked_at, created_at, replaced_by_token_id
      FROM refresh_tokens
      WHERE token_hash = :tokenHash
      LIMIT 1
      FOR UPDATE
      """;

  private static final String SQL_INSERT_REFRESH_TOKEN = """
      INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
      VALUES (:id, :userId, :tokenHash, :expiresAt, :createdAt)
      """;

  private static final String SQL_REVOKE_REFRESH_TOKEN = """
      UPDATE refresh_tokens
      SET revoked_at = :revokedAt
      WHERE id = :id AND revoked_at IS NULL
      """;

  private static final String SQL_SET_REPLACED_BY_TOKEN = """
      UPDATE refresh_tokens
      SET replaced_by_token_id = :replacedByTokenId
      WHERE id = :id
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;

  public RefreshTokenRepositoryAdapter(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public Optional<RefreshToken> findByTokenHash(String tokenHash) {
    MapSqlParameterSource params = new MapSqlParameterSource("tokenHash", tokenHash);
    List<RefreshToken> rows = jdbcTemplate.query(SQL_FIND_BY_TOKEN_HASH, params, refreshTokenRowMapper());
    return rows.stream().findFirst();
  }

  @Override
  public Optional<RefreshToken> findByTokenHashForUpdate(String tokenHash) {
    MapSqlParameterSource params = new MapSqlParameterSource("tokenHash", tokenHash);
    List<RefreshToken> rows = jdbcTemplate.query(SQL_FIND_BY_TOKEN_HASH_FOR_UPDATE, params, refreshTokenRowMapper());
    return rows.stream().findFirst();
  }

  @Override
  @Transactional
  public RefreshToken save(UUID userId, String tokenHash, Instant expiresAt) {
    UUID id = UUID.randomUUID();
    Instant now = Instant.now();

    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("id", id)
        .addValue("userId", userId)
        .addValue("tokenHash", tokenHash)
        .addValue("expiresAt", Timestamp.from(expiresAt))
        .addValue("createdAt", Timestamp.from(now));

    jdbcTemplate.update(SQL_INSERT_REFRESH_TOKEN, params);

    return new RefreshToken(id, userId, tokenHash, expiresAt, null, now, null);
  }

  @Override
  @Transactional
  public void revoke(UUID id, Instant revokedAt) {
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("id", id)
        .addValue("revokedAt", Timestamp.from(revokedAt));
    jdbcTemplate.update(SQL_REVOKE_REFRESH_TOKEN, params);
  }

  @Override
  @Transactional
  public boolean revokeIfActive(UUID id, Instant revokedAt) {
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("id", id)
        .addValue("revokedAt", Timestamp.from(revokedAt));
    return jdbcTemplate.update(SQL_REVOKE_REFRESH_TOKEN, params) == 1;
  }

  @Override
  @Transactional
  public void setReplacedByTokenId(UUID id, UUID replacedByTokenId) {
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("id", id)
        .addValue("replacedByTokenId", replacedByTokenId);
    jdbcTemplate.update(SQL_SET_REPLACED_BY_TOKEN, params);
  }

  private RowMapper<RefreshToken> refreshTokenRowMapper() {
    return (rs, rowNum) -> new RefreshToken(
        rs.getObject("id", UUID.class),
        rs.getObject("user_id", UUID.class),
        rs.getString("token_hash"),
        rs.getTimestamp("expires_at").toInstant(),
        rs.getTimestamp("revoked_at") == null ? null : rs.getTimestamp("revoked_at").toInstant(),
        rs.getTimestamp("created_at").toInstant(),
        rs.getObject("replaced_by_token_id", UUID.class)
    );
  }
}
