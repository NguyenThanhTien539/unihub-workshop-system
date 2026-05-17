package com.unihub.application.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.unihub.application.payment.exception.PaymentException;
import com.unihub.domain.payment.PaymentErrorCode;
import com.unihub.infrastructure.config.PaymentProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PaymentCircuitBreakerTest {
  private MutableClock clock;
  private PaymentCircuitBreaker breaker;

  @BeforeEach
  void setUp() {
    clock = new MutableClock(Instant.parse("2026-05-01T08:00:00Z"));
    breaker = new PaymentCircuitBreaker(
        new PaymentProperties(
            15,
            null,
            new PaymentProperties.CircuitBreaker(true, 2, 60, 1, 5000)),
        clock);
  }

  @Test
  void gatewaySuccessKeepsCircuitClosed() {
    String result = breaker.execute(() -> "ok");

    assertEquals("ok", result);
    assertEquals(PaymentCircuitBreakerState.CLOSED, breaker.snapshot().state());
    assertEquals(0, breaker.snapshot().failureCount());
  }

  @Test
  void consecutiveGatewayFailuresOpenCircuit() {
    assertThrows(RuntimeException.class, () -> breaker.execute(() -> {
      throw new RuntimeException("first");
    }));
    assertEquals(PaymentCircuitBreakerState.CLOSED, breaker.snapshot().state());

    assertThrows(RuntimeException.class, () -> breaker.execute(() -> {
      throw new RuntimeException("second");
    }));

    assertEquals(PaymentCircuitBreakerState.OPEN, breaker.snapshot().state());
    assertEquals(2, breaker.snapshot().failureCount());
  }

  @Test
  void openCircuitRejectsWithoutCallingGateway() {
    openBreaker();
    AtomicInteger calls = new AtomicInteger();

    PaymentException ex = assertThrows(PaymentException.class, () -> breaker.execute(() -> {
      calls.incrementAndGet();
      return "called";
    }));

    assertEquals(PaymentErrorCode.PAYMENT_GATEWAY_UNAVAILABLE, ex.getErrorCode());
    assertEquals(0, calls.get());
  }

  @Test
  void afterOpenDurationCircuitMovesToHalfOpen() {
    openBreaker();

    clock.advance(Duration.ofSeconds(60));

    assertEquals(PaymentCircuitBreakerState.HALF_OPEN, breaker.snapshot().state());
  }

  @Test
  void halfOpenSuccessClosesCircuit() {
    openBreaker();
    clock.advance(Duration.ofSeconds(60));

    breaker.execute(() -> "ok");

    assertEquals(PaymentCircuitBreakerState.CLOSED, breaker.snapshot().state());
    assertEquals(0, breaker.snapshot().failureCount());
  }

  @Test
  void halfOpenFailureReopensCircuit() {
    openBreaker();
    clock.advance(Duration.ofSeconds(60));

    assertThrows(RuntimeException.class, () -> breaker.execute(() -> {
      throw new RuntimeException("still down");
    }));

    assertEquals(PaymentCircuitBreakerState.OPEN, breaker.snapshot().state());
    assertTrue(breaker.snapshot().nextRetryAt().isAfter(breaker.snapshot().openedAt()));
  }

  @Test
  void gatewayTimeoutIsRecordedAsFailure() {
    assertThrows(PaymentException.class, () -> breaker.execute(() -> {
      throw new PaymentException(PaymentErrorCode.PAYMENT_TIMEOUT, org.springframework.http.HttpStatus.GATEWAY_TIMEOUT);
    }));

    assertEquals(1, breaker.snapshot().failureCount());
  }

  private void openBreaker() {
    for (int i = 0; i < 2; i++) {
      assertThrows(RuntimeException.class, () -> breaker.execute(() -> {
        throw new RuntimeException("down");
      }));
    }
  }

  private static final class MutableClock extends Clock {
    private Instant instant;

    private MutableClock(Instant instant) {
      this.instant = instant;
    }

    @Override
    public ZoneId getZone() {
      return ZoneId.of("UTC");
    }

    @Override
    public Clock withZone(ZoneId zone) {
      return this;
    }

    @Override
    public Instant instant() {
      return instant;
    }

    void advance(Duration duration) {
      instant = instant.plus(duration);
    }
  }
}
