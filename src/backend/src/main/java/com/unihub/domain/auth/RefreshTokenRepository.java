package com.unihub.domain.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository {
  Optional<RefreshToken> findByTokenHash(String tokenHash);

  RefreshToken save(UUID userId, String tokenHash, Instant expiresAt);

  void revoke(UUID id, Instant revokedAt);

  void setReplacedByTokenId(UUID id, UUID replacedByTokenId);
}

