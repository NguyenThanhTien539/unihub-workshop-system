package com.unihub.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.qr")
public record QrProperties(
    String issuer,
    long ttlMinutes,
    int imageSize) {
}
