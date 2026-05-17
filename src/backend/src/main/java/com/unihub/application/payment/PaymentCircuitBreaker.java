package com.unihub.application.payment;

import com.unihub.application.payment.exception.PaymentException;
import com.unihub.domain.payment.PaymentErrorCode;
import com.unihub.infrastructure.config.PaymentProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class PaymentCircuitBreaker {
  private static final Logger log = LoggerFactory.getLogger(PaymentCircuitBreaker.class);
  private static final String PROVIDER = "ZALOPAY";

  private final PaymentProperties.CircuitBreaker properties;
  private final Clock clock;

  private PaymentCircuitBreakerState state = PaymentCircuitBreakerState.CLOSED;
  private int failureCount;
  private LocalDateTime openedAt;
  private int halfOpenInFlight;

  public PaymentCircuitBreaker(PaymentProperties paymentProperties, Clock clock) {
    this.properties = paymentProperties.circuitBreaker();
    this.clock = clock;
  }

  public <T> T execute(Supplier<T> gatewayCall) {
    if (properties == null || !properties.enabled()) {
      return gatewayCall.get();
    }

    CallPermit permit = acquirePermit();
    long startedAt = System.nanoTime();
    try {
      T result = gatewayCall.get();
      long elapsedMs = Duration.ofNanos(System.nanoTime() - startedAt).toMillis();
      if (elapsedMs > properties.slowCallThresholdMs()) {
        recordFailure("slow payment provider call: " + elapsedMs + "ms");
      } else {
        recordSuccess();
      }
      return result;
    } catch (RuntimeException ex) {
      recordFailure(ex.getClass().getSimpleName());
      throw ex;
    } finally {
      releasePermit(permit);
    }
  }

  public synchronized PaymentCircuitBreakerSnapshot snapshot() {
    LocalDateTime nextRetryAt = openedAt == null
        ? null
        : openedAt.plusSeconds(properties == null ? 0 : properties.openDurationSeconds());
    return new PaymentCircuitBreakerSnapshot(PROVIDER, currentState(), failureCount, openedAt, nextRetryAt);
  }

  synchronized void resetForTest() {
    state = PaymentCircuitBreakerState.CLOSED;
    failureCount = 0;
    openedAt = null;
    halfOpenInFlight = 0;
  }

  private synchronized CallPermit acquirePermit() {
    PaymentCircuitBreakerState current = currentState();
    if (current == PaymentCircuitBreakerState.OPEN) {
      throw new PaymentException(
          PaymentErrorCode.PAYMENT_GATEWAY_UNAVAILABLE,
          HttpStatus.SERVICE_UNAVAILABLE);
    }

    if (current == PaymentCircuitBreakerState.HALF_OPEN) {
      int maxCalls = Math.max(1, properties.halfOpenMaxCalls());
      if (halfOpenInFlight >= maxCalls) {
        throw new PaymentException(
            PaymentErrorCode.PAYMENT_GATEWAY_UNAVAILABLE,
            HttpStatus.SERVICE_UNAVAILABLE);
      }
      halfOpenInFlight++;
      return new CallPermit(true);
    }

    return new CallPermit(false);
  }

  private synchronized void releasePermit(CallPermit permit) {
    if (permit.halfOpen()) {
      halfOpenInFlight = Math.max(0, halfOpenInFlight - 1);
    }
  }

  private synchronized PaymentCircuitBreakerState currentState() {
    if (state == PaymentCircuitBreakerState.OPEN && openedAt != null) {
      LocalDateTime retryAt = openedAt.plusSeconds(properties.openDurationSeconds());
      if (!LocalDateTime.now(clock).isBefore(retryAt)) {
        state = PaymentCircuitBreakerState.HALF_OPEN;
        halfOpenInFlight = 0;
      }
    }
    return state;
  }

  private synchronized void recordSuccess() {
    if (state == PaymentCircuitBreakerState.HALF_OPEN) {
      log.info("Payment circuit breaker closed after successful half-open probe");
    }
    state = PaymentCircuitBreakerState.CLOSED;
    failureCount = 0;
    openedAt = null;
  }

  private synchronized void recordFailure(String reason) {
    if (state == PaymentCircuitBreakerState.HALF_OPEN) {
      open(reason);
      return;
    }

    failureCount++;
    if (failureCount >= Math.max(1, properties.failureThreshold())) {
      open(reason);
    }
  }

  private void open(String reason) {
    state = PaymentCircuitBreakerState.OPEN;
    openedAt = LocalDateTime.now(clock);
    halfOpenInFlight = 0;
    log.warn("Payment circuit breaker opened for provider {} after failure: {}", PROVIDER, reason);
  }

  private record CallPermit(boolean halfOpen) {
  }
}
