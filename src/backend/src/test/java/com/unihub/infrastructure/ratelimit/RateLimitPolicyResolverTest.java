package com.unihub.infrastructure.ratelimit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.unihub.infrastructure.security.UserPrincipal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.TestingAuthenticationToken;

class RateLimitPolicyResolverTest {
  private RateLimitPolicyResolver resolver;

  @BeforeEach
  void setUp() {
    RateLimitProperties properties = new RateLimitProperties();
    properties.setEnabled(true);
    ClientIpResolver clientIpResolver = new ClientIpResolver(properties);
    resolver = new RateLimitPolicyResolver(properties, clientIpResolver, new RateLimitKeyBuilder());
  }

  @Test
  void loginUsesIpBucket() {
    MockHttpServletRequest request = request("POST", "/api/auth/login", "127.0.0.1");

    ResolvedRateLimitRequest resolved = resolver.resolve(request, null);

    assertEquals("login", resolved.policy().name());
    assertEquals("rate_limit:login:ip:127.0.0.1", resolved.key());
  }

  @Test
  void registrationUsesAuthenticatedUserBucket() {
    MockHttpServletRequest request = request("POST", "/api/registrations/free", "127.0.0.1");
    TestingAuthenticationToken authentication = authenticatedUser(UUID.fromString("20000000-0000-0000-0000-000000000001"));

    ResolvedRateLimitRequest resolved = resolver.resolve(request, authentication);

    assertEquals("registration", resolved.policy().name());
    assertEquals(
        "rate_limit:registration:user:20000000-0000-0000-0000-000000000001",
        resolved.key());
  }

  @Test
  void differentUsersGetDifferentRegistrationBuckets() {
    MockHttpServletRequest request = request("POST", "/api/registrations/paid", "127.0.0.1");

    ResolvedRateLimitRequest first = resolver.resolve(
        request,
        authenticatedUser(UUID.fromString("20000000-0000-0000-0000-000000000001")));
    ResolvedRateLimitRequest second = resolver.resolve(
        request,
        authenticatedUser(UUID.fromString("20000000-0000-0000-0000-000000000002")));

    assertNotEquals(first.key(), second.key());
  }

  @Test
  void optionsRequestsAreSkipped() {
    MockHttpServletRequest request = request("OPTIONS", "/api/registrations/free", "127.0.0.1");

    assertNull(resolver.resolve(request, null));
  }

  @Test
  void healthEndpointIsSkipped() {
    MockHttpServletRequest request = request("GET", "/api/health", "127.0.0.1");

    assertNull(resolver.resolve(request, null));
  }

  private MockHttpServletRequest request(String method, String path, String remoteAddr) {
    MockHttpServletRequest request = new MockHttpServletRequest(method, path);
    request.setServletPath(path);
    request.setRemoteAddr(remoteAddr);
    return request;
  }

  private TestingAuthenticationToken authenticatedUser(UUID userId) {
    UserPrincipal principal = new UserPrincipal(userId, "user@unihub.local", List.of("student"));
    TestingAuthenticationToken authentication = new TestingAuthenticationToken(principal, null);
    authentication.setAuthenticated(true);
    return authentication;
  }
}
