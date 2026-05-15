package com.unihub.infrastructure.ratelimit;

public record RateLimitPolicy(
    String name,
    int capacity,
    int refillTokens,
    long refillPeriodSeconds) {
  public RateLimitPolicy {
    if (capacity <= 0) {
      throw new IllegalArgumentException("Rate limit capacity must be positive");
    }
    if (refillTokens <= 0) {
      throw new IllegalArgumentException("Rate limit refill tokens must be positive");
    }
    if (refillPeriodSeconds <= 0) {
      throw new IllegalArgumentException("Rate limit refill period must be positive");
    }
  }
}
