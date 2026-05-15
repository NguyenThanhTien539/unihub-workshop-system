package com.unihub.infrastructure.ratelimit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

@ExtendWith(MockitoExtension.class)
class RateLimitFilterTest {
  @Mock private RateLimitPolicyResolver rateLimitPolicyResolver;
  @Mock private RateLimiter rateLimiter;

  private RateLimitProperties properties;
  private RateLimitFilter filter;

  @BeforeEach
  void setUp() {
    properties = new RateLimitProperties();
    properties.setEnabled(true);
    filter = new RateLimitFilter(properties, rateLimitPolicyResolver, rateLimiter, new ObjectMapper());
  }

  @Test
  void allowedRequestPassesThrough() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain chain = new MockFilterChain();
    ResolvedRateLimitRequest resolved = new ResolvedRateLimitRequest(
        new RateLimitPolicy("login", 10, 10, 60),
        "rate_limit:login:ip:127.0.0.1");

    when(rateLimitPolicyResolver.resolve(request, null)).thenReturn(resolved);
    when(rateLimiter.check(resolved.key(), resolved.policy())).thenReturn(new RateLimitResult(true, 10, 9, 60, 0));

    filter.doFilter(request, response, chain);

    assertEquals(200, response.getStatus());
    assertEquals("10", response.getHeader("X-RateLimit-Limit"));
    assertEquals("9", response.getHeader("X-RateLimit-Remaining"));
    assertTrue(response.getContentAsString().isEmpty());
  }

  @Test
  void exceededLimitReturns429AndStopsChain() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain chain = new MockFilterChain();
    ResolvedRateLimitRequest resolved = new ResolvedRateLimitRequest(
        new RateLimitPolicy("login", 10, 10, 60),
        "rate_limit:login:ip:127.0.0.1");

    when(rateLimitPolicyResolver.resolve(request, null)).thenReturn(resolved);
    when(rateLimiter.check(resolved.key(), resolved.policy())).thenReturn(new RateLimitResult(false, 10, 0, 42, 42));

    filter.doFilter(request, response, chain);

    assertEquals(429, response.getStatus());
    assertEquals("42", response.getHeader("Retry-After"));
    assertTrue(response.getContentAsString().contains("RATE_LIMIT_EXCEEDED"));
    assertFalse(response.getContentAsString().isEmpty());
  }

  @Test
  void disabledRateLimitingSkipsResolverAndAllowsRequest() throws Exception {
    properties.setEnabled(false);
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain chain = new MockFilterChain();

    filter.doFilter(request, response, chain);

    assertEquals(200, response.getStatus());
    verify(rateLimitPolicyResolver, never()).resolve(request, null);
  }
}
