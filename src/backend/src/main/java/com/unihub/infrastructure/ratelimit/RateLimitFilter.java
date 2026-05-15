package com.unihub.infrastructure.ratelimit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.unihub.presentation.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RateLimitFilter extends OncePerRequestFilter {
  private final RateLimitProperties rateLimitProperties;
  private final RateLimitPolicyResolver rateLimitPolicyResolver;
  private final RateLimiter rateLimiter;
  private final ObjectMapper objectMapper;

  public RateLimitFilter(
      RateLimitProperties rateLimitProperties,
      RateLimitPolicyResolver rateLimitPolicyResolver,
      RateLimiter rateLimiter,
      ObjectMapper objectMapper) {
    this.rateLimitProperties = rateLimitProperties;
    this.rateLimitPolicyResolver = rateLimitPolicyResolver;
    this.rateLimiter = rateLimiter;
    this.objectMapper = objectMapper;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    if (!rateLimitProperties.isEnabled()) {
      filterChain.doFilter(request, response);
      return;
    }

    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    ResolvedRateLimitRequest resolved = rateLimitPolicyResolver.resolve(request, authentication);
    if (resolved == null) {
      filterChain.doFilter(request, response);
      return;
    }

    RateLimitResult result = rateLimiter.check(resolved.key(), resolved.policy());
    addHeaders(response, result);

    if (!result.allowed()) {
      writeTooManyRequests(response, result.retryAfterSeconds());
      return;
    }

    filterChain.doFilter(request, response);
  }

  private void addHeaders(HttpServletResponse response, RateLimitResult result) {
    response.setHeader("X-RateLimit-Limit", String.valueOf(result.limit()));
    response.setHeader("X-RateLimit-Remaining", String.valueOf(result.remaining()));
    response.setHeader("X-RateLimit-Reset", String.valueOf(result.resetAfterSeconds()));
    if (result.retryAfterSeconds() > 0) {
      response.setHeader("Retry-After", String.valueOf(result.retryAfterSeconds()));
    }
  }

  private void writeTooManyRequests(HttpServletResponse response, long retryAfterSeconds) throws IOException {
    response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
    response.setCharacterEncoding("UTF-8");
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setHeader("Retry-After", String.valueOf(Math.max(1L, retryAfterSeconds)));
    ApiResponse<Void> body = ApiResponse.error(
        "RATE_LIMIT_EXCEEDED",
        "Too many requests. Please try again in " + Math.max(1L, retryAfterSeconds) + " seconds.");
    objectMapper.writeValue(response.getWriter(), body);
  }
}
