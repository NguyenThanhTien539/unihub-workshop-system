package com.unihub.infrastructure.payment.zalopay;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.unihub.application.payment.exception.PaymentException;
import com.unihub.domain.payment.PaymentErrorCode;
import com.unihub.domain.payment.PaymentIntent;
import com.unihub.domain.payment.PaymentStatus;
import com.unihub.domain.registration.RegistrationStatus;
import com.unihub.domain.registration.RegistrationType;
import com.unihub.domain.registration.RegistrationView;
import com.unihub.infrastructure.config.PaymentProperties;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class ZaloPayPaymentProviderTest {
  private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-05-08T10:00:00Z"), ZoneOffset.UTC);

  private ZaloPayMacSigner signer;
  private PaymentProperties.ZaloPay props;
  private ZaloPayPaymentProvider provider;

  @BeforeEach
  void setUp() {
    signer = new ZaloPayMacSigner();
    props = new PaymentProperties.ZaloPay(
        "2554",
        "key1-secret",
        "key2-secret",
        "http://127.0.0.1:1",
        200,
        200,
        "http://localhost:8080/api/payments/zalopay/callback",
        "http://localhost:3000/payments/result",
        true,
        true);
    provider = new ZaloPayPaymentProvider(new PaymentProperties(15, props), signer, new ObjectMapper(), CLOCK);
  }

  @Test
  void signCreateOrderUsesKey1Formula() {
    String embedData = "{\"paymentIntentId\":\"pi-1\"}";
    String items = "[]";

    String mac = provider.signCreateOrderRequest(
        "2554",
        "260508_123456",
        "student-user",
        50000L,
        1715162400000L,
        embedData,
        items,
        props.key1());

    assertEquals(
        signer.sign("2554|260508_123456|student-user|50000|1715162400000|{\"paymentIntentId\":\"pi-1\"}|[]", props.key1()),
        mac);
  }

  @Test
  void verifyAndParseCallbackUsesKey2() {
    UUID paymentIntentId = UUID.randomUUID();
    UUID registrationId = UUID.randomUUID();
    String data = "{\"app_trans_id\":\"260508_abcdef\",\"amount\":50000,\"server_time\":1715162700000,"
        + "\"embed_data\":\"{\\\"paymentIntentId\\\":\\\"" + paymentIntentId + "\\\",\\\"registrationId\\\":\\\"" + registrationId + "\\\"}\","
        + "\"status\":1}";
    String mac = signer.sign(data, props.key2());

    ZaloPayCallbackPayload payload = provider.verifyAndParseCallback(data, mac);

    assertEquals("260508_abcdef", payload.providerTransactionId());
    assertEquals(paymentIntentId, payload.paymentIntentId());
    assertEquals(registrationId, payload.registrationId());
    assertEquals(BigDecimal.valueOf(50000), payload.amount());
    assertEquals("VND", payload.currency());
  }

  @Test
  void invalidCallbackMacIsRejected() {
    PaymentException ex = assertThrows(PaymentException.class,
        () -> provider.verifyAndParseCallback("{\"amount\":50000}", "wrong-mac"));

    assertEquals(PaymentErrorCode.PAYMENT_CALLBACK_MAC_INVALID, ex.getErrorCode());
    assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
    assertEquals("mac not equal", ex.getMessage());
  }

  @Test
  void createOrderNetworkFailureReturnsControlledError() {
    PaymentIntent paymentIntent = new PaymentIntent(
        UUID.randomUUID(),
        UUID.randomUUID(),
        "ZALOPAY",
        "payment-intent:test",
        null,
        PaymentStatus.PENDING_GATEWAY,
        BigDecimal.valueOf(50000),
        "VND",
        null,
        LocalDateTime.of(2026, 5, 8, 10, 15),
        null,
        null,
        LocalDateTime.of(2026, 5, 8, 10, 0),
        LocalDateTime.of(2026, 5, 8, 10, 0));
    RegistrationView registrationView = new RegistrationView(
        paymentIntent.registrationId(),
        UUID.randomUUID(),
        UUID.randomUUID(),
        "Workshop",
        UUID.randomUUID(),
        "Room A",
        "H1",
        LocalDateTime.of(2026, 6, 1, 8, 0),
        LocalDateTime.of(2026, 6, 1, 10, 0),
        RegistrationStatus.PENDING_PAYMENT,
        RegistrationType.PAID,
        paymentIntent.id(),
        PaymentStatus.PENDING_GATEWAY,
        BigDecimal.valueOf(50000),
        "VND",
        paymentIntent.expiresAt(),
        null,
        false,
        LocalDateTime.of(2026, 5, 8, 10, 0),
        null);

    PaymentException ex = assertThrows(PaymentException.class,
        () -> provider.createOrder(paymentIntent, registrationView, UUID.randomUUID()));

    assertEquals(PaymentErrorCode.PAYMENT_PROVIDER_UNAVAILABLE, ex.getErrorCode());
    assertEquals(HttpStatus.BAD_GATEWAY, ex.getStatus());
  }
}
