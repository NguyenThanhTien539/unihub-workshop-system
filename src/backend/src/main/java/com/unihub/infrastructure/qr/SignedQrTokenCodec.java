package com.unihub.infrastructure.qr;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.unihub.application.qr.QrTokenCodec;
import com.unihub.domain.qr.QrTicket;
import com.unihub.infrastructure.config.QrProperties;
import java.nio.charset.StandardCharsets;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
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
    payload.put("exp", qrTicket.expiresAt() == null ? null : qrTicket.expiresAt().toInstant(ZoneOffset.UTC).toEpochMilli());
    try {
      String encodedPayload = Base64.getUrlEncoder().withoutPadding().encodeToString(
          objectMapper.writeValueAsBytes(payload));
      String signature = hmacSha256(encodedPayload, signingSecret);
      return encodedPayload + "." + signature;
    } catch (Exception ex) {
      throw new IllegalStateException("Unable to create QR payload", ex);
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
}
