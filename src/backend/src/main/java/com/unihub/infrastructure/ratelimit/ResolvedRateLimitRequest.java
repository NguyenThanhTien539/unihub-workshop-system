package com.unihub.infrastructure.ratelimit;

public record ResolvedRateLimitRequest(
    RateLimitPolicy policy,
    String key) {
}
