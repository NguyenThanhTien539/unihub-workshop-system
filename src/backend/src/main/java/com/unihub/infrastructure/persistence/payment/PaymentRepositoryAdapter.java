package com.unihub.infrastructure.persistence.payment;

import com.unihub.domain.payment.PaymentIntent;
import com.unihub.domain.payment.PaymentRepository;
import com.unihub.domain.payment.PaymentStatus;
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
public class PaymentRepositoryAdapter implements PaymentRepository {
  private static final String BASE_SELECT = """
      SELECT id, registration_id, idempotency_key, gateway_ref, status, amount, currency,
             payment_url, expires_at, paid_at, failure_reason, created_at, updated_at
      FROM payment_intents
      """;

  private static final String SQL_INSERT = """
      INSERT INTO payment_intents (
        id, registration_id, idempotency_key, gateway_ref, status, amount, currency,
        payment_url, expires_at, paid_at, failure_reason, created_at, updated_at
      ) VALUES (
        :id, :registrationId, :idempotencyKey, :gatewayRef, :status, :amount, :currency,
        :paymentUrl, :expiresAt, :paidAt, :failureReason, :createdAt, :updatedAt
      )
      """;

  private static final String SQL_UPDATE = """
      UPDATE payment_intents
      SET gateway_ref = :gatewayRef,
          status = :status,
          payment_url = :paymentUrl,
          expires_at = :expiresAt,
          paid_at = :paidAt,
          failure_reason = :failureReason,
          updated_at = :updatedAt
      WHERE id = :id
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;

  public PaymentRepositoryAdapter(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public PaymentIntent save(PaymentIntent paymentIntent) {
    jdbcTemplate.update(SQL_INSERT, params(paymentIntent));
    return paymentIntent;
  }

  @Override
  public PaymentIntent update(PaymentIntent paymentIntent) {
    jdbcTemplate.update(SQL_UPDATE, params(paymentIntent));
    return paymentIntent;
  }

  @Override
  public Optional<PaymentIntent> findById(UUID paymentIntentId) {
    return querySingle(BASE_SELECT + " WHERE id = :id LIMIT 1",
        new MapSqlParameterSource("id", paymentIntentId));
  }

  @Override
  public Optional<PaymentIntent> findByIdForUpdate(UUID paymentIntentId) {
    return querySingle(BASE_SELECT + " WHERE id = :id LIMIT 1 FOR UPDATE",
        new MapSqlParameterSource("id", paymentIntentId));
  }

  @Override
  public Optional<PaymentIntent> findByRegistrationId(UUID registrationId) {
    return querySingle(BASE_SELECT + " WHERE registration_id = :registrationId LIMIT 1",
        new MapSqlParameterSource("registrationId", registrationId));
  }

  @Override
  public Optional<PaymentIntent> findByGatewayRef(String gatewayRef) {
    return querySingle(BASE_SELECT + " WHERE gateway_ref = :gatewayRef LIMIT 1",
        new MapSqlParameterSource("gatewayRef", gatewayRef));
  }

  @Override
  public Optional<PaymentIntent> findByGatewayRefForUpdate(String gatewayRef) {
    return querySingle(BASE_SELECT + " WHERE gateway_ref = :gatewayRef LIMIT 1 FOR UPDATE",
        new MapSqlParameterSource("gatewayRef", gatewayRef));
  }

  private Optional<PaymentIntent> querySingle(String sql, MapSqlParameterSource params) {
    List<PaymentIntent> rows = jdbcTemplate.query(sql, params, rowMapper());
    return rows.stream().findFirst();
  }

  private MapSqlParameterSource params(PaymentIntent paymentIntent) {
    return new MapSqlParameterSource()
        .addValue("id", paymentIntent.id())
        .addValue("registrationId", paymentIntent.registrationId())
        .addValue("idempotencyKey", paymentIntent.idempotencyKey())
        .addValue("gatewayRef", paymentIntent.gatewayRef())
        .addValue("status", paymentIntent.status().name())
        .addValue("amount", paymentIntent.amount())
        .addValue("currency", paymentIntent.currency())
        .addValue("paymentUrl", paymentIntent.paymentUrl())
        .addValue("expiresAt", toTimestamp(paymentIntent.expiresAt()))
        .addValue("paidAt", toTimestamp(paymentIntent.paidAt()))
        .addValue("failureReason", paymentIntent.failureReason())
        .addValue("createdAt", toTimestamp(paymentIntent.createdAt()))
        .addValue("updatedAt", toTimestamp(paymentIntent.updatedAt()));
  }

  private RowMapper<PaymentIntent> rowMapper() {
    return (rs, rowNum) -> new PaymentIntent(
        rs.getObject("id", UUID.class),
        rs.getObject("registration_id", UUID.class),
        rs.getString("idempotency_key"),
        rs.getString("gateway_ref"),
        PaymentStatus.valueOf(rs.getString("status")),
        rs.getBigDecimal("amount"),
        rs.getString("currency"),
        rs.getString("payment_url"),
        toLocalDateTime(rs.getTimestamp("expires_at")),
        toLocalDateTime(rs.getTimestamp("paid_at")),
        rs.getString("failure_reason"),
        toLocalDateTime(rs.getTimestamp("created_at")),
        toLocalDateTime(rs.getTimestamp("updated_at")));
  }

  private Timestamp toTimestamp(LocalDateTime value) {
    return value == null ? null : Timestamp.valueOf(value);
  }

  private LocalDateTime toLocalDateTime(Timestamp value) {
    return value == null ? null : value.toLocalDateTime();
  }
}
