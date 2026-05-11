package com.unihub.infrastructure.security;

import com.unihub.application.auth.model.CurrentUser;
import com.unihub.application.auth.model.TokenPair;
import com.unihub.application.auth.port.TokenProvider;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider implements TokenProvider {
  private static final SecureRandom SECURE_RANDOM = new SecureRandom();

  private final JwtEncoder jwtEncoder;
  private final Clock clock;
  private final long accessTokenTtlMinutes;

  public JwtTokenProvider(
      JwtEncoder jwtEncoder,
      Clock clock,
      @Value("${app.auth.jwt.access-token-ttl-minutes:15}") long accessTokenTtlMinutes) {
    this.jwtEncoder = jwtEncoder;
    this.clock = clock;
    this.accessTokenTtlMinutes = accessTokenTtlMinutes;
  }

  @Override
  public TokenPair issueTokenPair(CurrentUser user) {
    Instant issuedAt = Instant.now(clock);
    Instant expiresAt = issuedAt.plus(accessTokenTtlMinutes, ChronoUnit.MINUTES);

    JwtClaimsSet claims = JwtClaimsSet.builder()
        .subject(user.id().toString())
        .issuedAt(issuedAt)
        .expiresAt(expiresAt)
        .claim("email", user.email())
        .claim("roles", user.roles())
        .claim("token_type", "access")
        .claim("issued_at", issuedAt.toString())
        .claim("expires_at", expiresAt.toString())
        .claim("jti", UUID.randomUUID().toString())
        .build();

    JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
    String accessToken = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    String refreshToken = generateOpaqueRefreshToken();

    long expiresIn = ChronoUnit.SECONDS.between(issuedAt, expiresAt);
    return new TokenPair(accessToken, refreshToken, expiresIn);
  }

  private String generateOpaqueRefreshToken() {
    byte[] randomBytes = new byte[48];
    SECURE_RANDOM.nextBytes(randomBytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
  }
}
