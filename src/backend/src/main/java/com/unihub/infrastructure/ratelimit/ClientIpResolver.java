package com.unihub.infrastructure.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

@Component
public class ClientIpResolver {
  private final RateLimitProperties rateLimitProperties;

  public ClientIpResolver(RateLimitProperties rateLimitProperties) {
    this.rateLimitProperties = rateLimitProperties;
  }

  public String resolve(HttpServletRequest request) {
    if (rateLimitProperties.isTrustForwardedFor()) {
      String header = request.getHeader("X-Forwarded-For");
      if (header != null && !header.isBlank()) {
        String[] parts = header.split(",");
        String candidate = parts[0].trim();
        if (!candidate.isBlank()) {
          return candidate;
        }
      }
    }

    String remoteAddr = request.getRemoteAddr();
    return (remoteAddr == null || remoteAddr.isBlank()) ? "unknown" : remoteAddr;
  }
}
