package com.unihub.domain.auth;

import java.time.Instant;
import java.util.UUID;

public record RefreshToken(
    UUID id,
    UUID userId,
    String tokenHash,
    Instant expiresAt,
    Instant revokedAt,
    Instant createdAt,
    UUID replacedByTokenId
) {
  public boolean isExpired(Instant now) {
    return expiresAt.isBefore(now);
  }

  public boolean isRevoked() {
    return revokedAt != null;
  }
}

