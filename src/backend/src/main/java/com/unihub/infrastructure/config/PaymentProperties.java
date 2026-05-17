package com.unihub.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.payment")
public record PaymentProperties(
    long pendingExpirationMinutes,
    ZaloPay zalopay,
    CircuitBreaker circuitBreaker) {

  public PaymentProperties(long pendingExpirationMinutes, ZaloPay zalopay) {
    this(pendingExpirationMinutes, zalopay, new CircuitBreaker(true, 5, 60, 1, 5000));
  }

  public record ZaloPay(
      String appId,
      String key1,
      String key2,
      String endpoint,
      int connectTimeoutMs,
      int readTimeoutMs,
      String callbackUrl,
      String frontendReturnUrl,
      boolean enabled,
      boolean sandboxMode) {
  }

  public record CircuitBreaker(
      boolean enabled,
      int failureThreshold,
      long openDurationSeconds,
      int halfOpenMaxCalls,
      long slowCallThresholdMs) {
  }
}
