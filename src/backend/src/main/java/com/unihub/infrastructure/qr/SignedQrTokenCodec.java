package com.unihub.infrastructure.qr;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.unihub.application.qr.QrTokenClaims;
import com.unihub.application.qr.QrTokenCodec;
import com.unihub.application.qr.QrTokenVerificationException;
import com.unihub.domain.qr.QrTicket;
import com.unihub.infrastructure.config.QrProperties;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class SignedQrTokenCodec implements QrTokenCodec {
  private final ObjectMapper objectMapper;
  private final QrProperties qrProperties;
  private final String signingSecret;

  public SignedQrTokenCodec(
      ObjectMapper objectMapper,
      QrProperties qrProperties,
      @Value("${app.auth.jwt.secret}") String signingSecret) {
    this.objectMapper = objectMapper;
    this.qrProperties = qrProperties;
    this.signingSecret = signingSecret;
  }

  @Override
  public String createPayload(QrTicket qrTicket) {
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("iss", qrProperties.issuer());
    payload.put("ticketId", qrTicket.id());
    payload.put("registrationId", qrTicket.registrationId());
    payload.put("iat", qrTicket.issuedAt().toInstant(ZoneOffset.UTC).toEpochMilli());
    payload.put("exp",
        qrTicket.expiresAt() == null ? null : qrTicket.expiresAt().toInstant(ZoneOffset.UTC).toEpochMilli());
    try {
      String encodedPayload = Base64.getUrlEncoder().withoutPadding().encodeToString(
          objectMapper.writeValueAsBytes(payload));
      String signature = hmacSha256(encodedPayload, signingSecret);
      return encodedPayload + "." + signature;
    } catch (Exception ex) {
      throw new IllegalStateException("Unable to create QR payload", ex);
    }
  }

  @Override
  public QrTokenClaims verifyPayload(String payload) {
    if (payload == null || payload.isBlank()) {
      throw new QrTokenVerificationException("QR payload is missing");
    }

    String[] parts = payload.split("\\.", 2);
    if (parts.length != 2 || parts[0].isBlank() || parts[1].isBlank()) {
      throw new QrTokenVerificationException("QR payload format is invalid");
    }

    String expectedSignature = hmacSha256(parts[0], signingSecret);
    if (!expectedSignature.equals(parts[1])) {
      throw new QrTokenVerificationException("QR payload signature is invalid");
    }

    try {
      byte[] decoded = Base64.getUrlDecoder().decode(parts[0]);
      Map<?, ?> claims = objectMapper.readValue(decoded, Map.class);
      String issuer = stringValue(claims.get("iss"));
      if (!qrProperties.issuer().equals(issuer)) {
        throw new QrTokenVerificationException("QR payload issuer is invalid");
      }

      return new QrTokenClaims(
          issuer,
          UUID.fromString(stringValue(claims.get("ticketId"))),
          UUID.fromString(stringValue(claims.get("registrationId"))),
          toLocalDateTime(numberValue(claims.get("iat"))),
          toLocalDateTime(numberValue(claims.get("exp"))));
    } catch (QrTokenVerificationException ex) {
      throw ex;
    } catch (Exception ex) {
      throw new QrTokenVerificationException("QR payload content is invalid", ex);
    }
  }

  private String hmacSha256(String value, String key) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      byte[] bytes = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
      StringBuilder builder = new StringBuilder(bytes.length * 2);
      for (byte current : bytes) {
        builder.append(String.format("%02x", current));
      }
      return builder.toString();
    } catch (Exception ex) {
      throw new IllegalStateException("Unable to sign QR payload", ex);
    }
  }

  private String stringValue(Object value) {
    if (value == null) {
      throw new QrTokenVerificationException("QR payload is missing a required field");
    }
    return String.valueOf(value);
  }

  private Long numberValue(Object value) {
    if (value == null) {
      return null;
    }
    if (value instanceof Number number) {
      return number.longValue();
    }
    return Long.parseLong(String.valueOf(value));
  }

  private LocalDateTime toLocalDateTime(Long epochMillis) {
    if (epochMillis == null) {
      return null;
    }
    return LocalDateTime.ofInstant(Instant.ofEpochMilli(epochMillis), ZoneOffset.UTC);
  }
}
