package com.unihub.infrastructure.ratelimit;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

@Component
public class RedisTokenBucketRateLimiter implements RateLimiter {
  private static final Logger log = LoggerFactory.getLogger(RedisTokenBucketRateLimiter.class);

  private static final String LUA_SCRIPT = """
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refillTokens = tonumber(ARGV[2])
      local refillPeriodMillis = tonumber(ARGV[3])
      local nowMillis = tonumber(ARGV[4])
      local ttlMillis = tonumber(ARGV[5])

      local state = redis.call('HMGET', key, 'tokens', 'last_refill')
      local tokens = tonumber(state[1])
      local lastRefill = tonumber(state[2])

      if tokens == nil then
        tokens = capacity
      end
      if lastRefill == nil then
        lastRefill = nowMillis
      end

      if nowMillis > lastRefill then
        local elapsed = nowMillis - lastRefill
        local refillPeriods = math.floor(elapsed / refillPeriodMillis)
        if refillPeriods > 0 then
          local refillAmount = refillPeriods * refillTokens
          tokens = math.min(capacity, tokens + refillAmount)
          lastRefill = lastRefill + (refillPeriods * refillPeriodMillis)
        end
      end

      local allowed = 0
      if tokens >= 1 then
        tokens = tokens - 1
        allowed = 1
      end

      redis.call('HSET', key, 'tokens', tokens, 'last_refill', lastRefill)
      redis.call('PEXPIRE', key, ttlMillis)

      local nextRefillMillis = lastRefill + refillPeriodMillis
      local resetAfterSeconds = math.max(0, math.ceil((nextRefillMillis - nowMillis) / 1000))
      local retryAfterSeconds = 0
      if allowed == 0 then
        retryAfterSeconds = math.max(1, resetAfterSeconds)
      end

      return { allowed, tokens, resetAfterSeconds, retryAfterSeconds }
      """;

  private final StringRedisTemplate stringRedisTemplate;
  private final Clock clock;
  private final DefaultRedisScript<List> tokenBucketScript;

  public RedisTokenBucketRateLimiter(StringRedisTemplate stringRedisTemplate, Clock clock) {
    this.stringRedisTemplate = stringRedisTemplate;
    this.clock = clock;
    DefaultRedisScript<List> script = new DefaultRedisScript<>();
    script.setScriptText(LUA_SCRIPT);
    script.setResultType(List.class);
    this.tokenBucketScript = script;
  }

  @Override
  public RateLimitResult check(String key, RateLimitPolicy policy) {
    String algorithm = "token-bucket";
    long nowMillis = Instant.now(clock).toEpochMilli();
    long refillPeriodMillis = policy.refillPeriodSeconds() * 1000L;
    long periodsToFull = Math.max(1L, (long) Math.ceil((double) policy.capacity() / policy.refillTokens()));
    long ttlMillis = Math.max(refillPeriodMillis * 3L, refillPeriodMillis * (periodsToFull + 1L));

    try {
      List<?> raw = stringRedisTemplate.execute(
          tokenBucketScript,
          List.of(key),
          String.valueOf(policy.capacity()),
          String.valueOf(policy.refillTokens()),
          String.valueOf(refillPeriodMillis),
          String.valueOf(nowMillis),
          String.valueOf(ttlMillis));

      long allowed = valueAt(raw, 0);
      long remaining = Math.max(0L, valueAt(raw, 1));
      long resetAfter = Math.max(0L, valueAt(raw, 2));
      long retryAfter = Math.max(0L, valueAt(raw, 3));
      return new RateLimitResult(allowed == 1L, policy.capacity(), remaining, resetAfter, retryAfter);
    } catch (RuntimeException ex) {
      // Fail open so Redis coordination outages do not take the whole API down.
      log.warn("Rate limiting temporarily unavailable for key {} using {}. Allowing request.", key, algorithm, ex);
      return new RateLimitResult(true, policy.capacity(), policy.capacity(), 0L, 0L);
    }
  }

  private long valueAt(List<?> values, int index) {
    if (values == null || values.size() <= index || values.get(index) == null) {
      throw new IllegalStateException("Redis token bucket script returned invalid result");
    }
    Object value = values.get(index);
    if (value instanceof Number number) {
      return number.longValue();
    }
    return Long.parseLong(String.valueOf(value));
  }
}
