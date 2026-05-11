package com.unihub.infrastructure.ratelimit;

import com.unihub.infrastructure.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;

@Component
public class RateLimitPolicyResolver {
  private final AntPathMatcher pathMatcher = new AntPathMatcher();
  private final RateLimitProperties rateLimitProperties;
  private final ClientIpResolver clientIpResolver;
  private final RateLimitKeyBuilder rateLimitKeyBuilder;

  public RateLimitPolicyResolver(
      RateLimitProperties rateLimitProperties,
      ClientIpResolver clientIpResolver,
      RateLimitKeyBuilder rateLimitKeyBuilder) {
    this.rateLimitProperties = rateLimitProperties;
    this.clientIpResolver = clientIpResolver;
    this.rateLimitKeyBuilder = rateLimitKeyBuilder;
  }

  public ResolvedRateLimitRequest resolve(HttpServletRequest request, Authentication authentication) {
    if (!rateLimitProperties.isEnabled()) {
      return null;
    }

    String method = request.getMethod();
    String path = request.getServletPath();
    if (path == null || path.isBlank()) {
      path = request.getRequestURI();
    }

    if ("OPTIONS".equalsIgnoreCase(method)) {
      return null;
    }
    if (matches(path, "/api/health", "/api/health/**")) {
      return null;
    }
    if ("GET".equalsIgnoreCase(method) && matches(path, "/api/workshops/**")) {
      return null;
    }

    if ("POST".equalsIgnoreCase(method) && matches(path, "/api/auth/login")) {
      return withIpPolicy("login", rateLimitProperties.getPolicies().getLogin().toPolicy("login"), request);
    }
    if ("POST".equalsIgnoreCase(method) && matches(path, "/api/auth/refresh")) {
      return withUserFallbackToIp(
          "auth-refresh",
          rateLimitProperties.getPolicies().getAuthRefresh().toPolicy("auth-refresh"),
          request,
          authentication);
    }
    if ("POST".equalsIgnoreCase(method) && matches(path, "/api/registrations/free", "/api/registrations/paid")) {
      return withUserFallbackToIp(
          "registration",
          rateLimitProperties.getPolicies().getRegistration().toPolicy("registration"),
          request,
          authentication);
    }
    if ("POST".equalsIgnoreCase(method)
        && matches(path, "/api/payments/**", "/api/payment/**")
        && !matches(path, "/api/payments/zalopay/callback", "/api/payment/zalopay/callback")) {
      return withUserFallbackToIp(
          "payment",
          rateLimitProperties.getPolicies().getPayment().toPolicy("payment"),
          request,
          authentication);
    }
    if ("POST".equalsIgnoreCase(method) && matches(path, "/api/checkin/sync")) {
      return withUserFallbackToIp(
          "checkin-sync",
          rateLimitProperties.getPolicies().getCheckinSync().toPolicy("checkin-sync"),
          request,
          authentication);
    }
    if (path != null && path.startsWith("/api/")) {
      return withIpPolicy("default-ip", rateLimitProperties.defaultIpPolicy(), request);
    }

    return null;
  }

  private boolean matches(String path, String... patterns) {
    for (String pattern : patterns) {
      if (pathMatcher.match(pattern, path)) {
        return true;
      }
    }
    return false;
  }

  private ResolvedRateLimitRequest withIpPolicy(String policyName, RateLimitPolicy policy, HttpServletRequest request) {
    String ip = clientIpResolver.resolve(request);
    return new ResolvedRateLimitRequest(policy, rateLimitKeyBuilder.build(policyName, "ip", ip));
  }

  private ResolvedRateLimitRequest withUserFallbackToIp(
      String policyName,
      RateLimitPolicy policy,
      HttpServletRequest request,
      Authentication authentication) {
    UserPrincipal principal = extractPrincipal(authentication);
    if (principal != null) {
      return new ResolvedRateLimitRequest(policy,
          rateLimitKeyBuilder.build(policyName, "user", principal.id().toString()));
    }
    return withIpPolicy(policyName, policy, request);
  }

  private UserPrincipal extractPrincipal(Authentication authentication) {
    if (authentication == null || !authentication.isAuthenticated()) {
      return null;
    }
    Object principal = authentication.getPrincipal();
    return principal instanceof UserPrincipal userPrincipal ? userPrincipal : null;
  }
}
