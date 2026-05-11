package com.unihub.infrastructure.ratelimit;

public record RateLimitResult(
    boolean allowed,
    int limit,
    long remaining,
    long resetAfterSeconds,
    long retryAfterSeconds) {
}
