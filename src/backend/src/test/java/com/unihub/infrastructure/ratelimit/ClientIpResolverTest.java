package com.unihub.infrastructure.ratelimit;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class ClientIpResolverTest {
  @Test
  void usesRemoteAddressWhenForwardedHeaderIsNotTrusted() {
    RateLimitProperties properties = new RateLimitProperties();
    properties.setTrustForwardedFor(false);
    ClientIpResolver resolver = new ClientIpResolver(properties);

    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setRemoteAddr("10.0.0.5");
    request.addHeader("X-Forwarded-For", "203.0.113.9");

    assertEquals("10.0.0.5", resolver.resolve(request));
  }

  @Test
  void usesFirstForwardedAddressWhenTrusted() {
    RateLimitProperties properties = new RateLimitProperties();
    properties.setTrustForwardedFor(true);
    ClientIpResolver resolver = new ClientIpResolver(properties);

    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setRemoteAddr("10.0.0.5");
    request.addHeader("X-Forwarded-For", "203.0.113.9, 10.0.0.10");

    assertEquals("203.0.113.9", resolver.resolve(request));
  }
}
