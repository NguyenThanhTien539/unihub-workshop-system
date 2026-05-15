package com.unihub.infrastructure.ratelimit;

public interface RateLimiter {
  RateLimitResult check(String key, RateLimitPolicy policy);
}
