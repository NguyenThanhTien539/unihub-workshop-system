package com.unihub.infrastructure.persistence.qr;

import com.unihub.domain.qr.QrTicket;
import com.unihub.domain.qr.QrTicketRepository;
import com.unihub.domain.qr.QrTicketStatus;
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
public class QrTicketRepositoryAdapter implements QrTicketRepository {
  private static final String SQL_FIND_BY_REGISTRATION_ID = """
      SELECT id, registration_id, qr_token_hash, status, issued_at, expires_at, revoked_at, created_at
      FROM qr_tickets
      WHERE registration_id = :registrationId
      LIMIT 1
      """;

  private static final String SQL_FIND_BY_TOKEN_HASH = """
      SELECT id, registration_id, qr_token_hash, status, issued_at, expires_at, revoked_at, created_at
      FROM qr_tickets
      WHERE qr_token_hash = :qrTokenHash
      LIMIT 1
      """;

  private static final String SQL_INSERT = """
      INSERT INTO qr_tickets (
        id, registration_id, qr_token_hash, status, issued_at, expires_at, revoked_at, created_at
      ) VALUES (
        :id, :registrationId, :qrTokenHash, :status, :issuedAt, :expiresAt, :revokedAt, :createdAt
      )
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;

  public QrTicketRepositoryAdapter(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public Optional<QrTicket> findByRegistrationId(UUID registrationId) {
    List<QrTicket> rows = jdbcTemplate.query(SQL_FIND_BY_REGISTRATION_ID,
        new MapSqlParameterSource("registrationId", registrationId), rowMapper());
    return rows.stream().findFirst();
  }

  @Override
  public Optional<QrTicket> findByTokenHash(String qrTokenHash) {
    List<QrTicket> rows = jdbcTemplate.query(SQL_FIND_BY_TOKEN_HASH,
        new MapSqlParameterSource("qrTokenHash", qrTokenHash), rowMapper());
    return rows.stream().findFirst();
  }

  @Override
  public QrTicket save(QrTicket qrTicket) {
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("id", qrTicket.id())
        .addValue("registrationId", qrTicket.registrationId())
        .addValue("qrTokenHash", qrTicket.qrTokenHash())
        .addValue("status", qrTicket.status().name())
        .addValue("issuedAt", Timestamp.valueOf(qrTicket.issuedAt()))
        .addValue("expiresAt", toTimestamp(qrTicket.expiresAt()))
        .addValue("revokedAt", toTimestamp(qrTicket.revokedAt()))
        .addValue("createdAt", Timestamp.valueOf(qrTicket.createdAt()));
    jdbcTemplate.update(SQL_INSERT, params);
    return qrTicket;
  }

  private RowMapper<QrTicket> rowMapper() {
    return (rs, rowNum) -> new QrTicket(
        rs.getObject("id", UUID.class),
        rs.getObject("registration_id", UUID.class),
        rs.getString("qr_token_hash"),
        QrTicketStatus.valueOf(rs.getString("status")),
        toLocalDateTime(rs.getTimestamp("issued_at")),
        toLocalDateTime(rs.getTimestamp("expires_at")),
        toLocalDateTime(rs.getTimestamp("revoked_at")),
        toLocalDateTime(rs.getTimestamp("created_at")));
  }

  private Timestamp toTimestamp(LocalDateTime value) {
    return value == null ? null : Timestamp.valueOf(value);
  }

  private LocalDateTime toLocalDateTime(Timestamp value) {
    return value == null ? null : value.toLocalDateTime();
  }
}
