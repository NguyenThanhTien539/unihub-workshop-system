package com.unihub.infrastructure.ratelimit;

import org.springframework.stereotype.Component;

@Component
public class RateLimitKeyBuilder {
  public String build(String policyName, String identityType, String identityValue) {
    return "rate_limit:" + policyName + ":" + identityType + ":" + sanitize(identityValue);
  }

  private String sanitize(String identityValue) {
    if (identityValue == null || identityValue.isBlank()) {
      return "unknown";
    }
    return identityValue.trim().replace(' ', '_');
  }
}
