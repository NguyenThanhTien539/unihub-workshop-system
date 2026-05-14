package com.unihub.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.payment")
public record PaymentProperties(
    long pendingExpirationMinutes,
    ZaloPay zalopay) {

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
}
