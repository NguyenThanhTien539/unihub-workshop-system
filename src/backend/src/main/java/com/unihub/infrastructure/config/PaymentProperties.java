package com.unihub.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "app.payment")
public record PaymentProperties(
    @DefaultValue("15") long pendingExpirationMinutes,
    @DefaultValue ZaloPay zalopay,
    @DefaultValue CircuitBreaker circuitBreaker) {

  public record ZaloPay(
      @DefaultValue("") String appId,
      @DefaultValue("") String key1,
      @DefaultValue("") String key2,
      @DefaultValue("https://sb-openapi.zalopay.vn/v2/create") String endpoint,
      @DefaultValue("3000") int connectTimeoutMs,
      @DefaultValue("5000") int readTimeoutMs,
      @DefaultValue("") String callbackUrl,
      @DefaultValue("") String frontendReturnUrl,
      @DefaultValue("false") boolean enabled,
      @DefaultValue("true") boolean sandboxMode) {
  }

  public record CircuitBreaker(
      @DefaultValue("true") boolean enabled,
      @DefaultValue("5") int failureThreshold,
      @DefaultValue("60") long openDurationSeconds,
      @DefaultValue("1") int halfOpenMaxCalls,
      @DefaultValue("5000") long slowCallThresholdMs) {
  }
}
