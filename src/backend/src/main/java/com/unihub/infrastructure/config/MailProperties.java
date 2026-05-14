package com.unihub.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.mail")
public record MailProperties(
    boolean enabled,
    String from,
    Queue queue) {

  public record Queue(
      boolean enabled,
      String stream,
      String consumerGroup,
      String consumerName,
      int maxRetries,
      long pollIntervalMs) {
  }
}
