package com.unihub.application.auth.command;

import com.unihub.application.auth.exception.AuthException;
import com.unihub.application.auth.model.CurrentUser;
import com.unihub.application.auth.model.LoginResult;
import com.unihub.application.auth.model.TokenPair;
import com.unihub.application.auth.port.TokenProvider;
import com.unihub.application.auth.query.AuthQueryService;
import com.unihub.domain.auth.RefreshToken;
import com.unihub.domain.auth.RefreshTokenRepository;
import com.unihub.domain.user.User;
import com.unihub.domain.user.UserErrorCode;
import com.unihub.domain.user.UserRepository;
import com.unihub.domain.user.UserStatus;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class AuthCommandService {
  private static final Logger log = LoggerFactory.getLogger(AuthCommandService.class);

  private final UserRepository userRepository;
  private final RefreshTokenRepository refreshTokenRepository;
  private final PasswordEncoder passwordEncoder;
  private final TokenProvider tokenProvider;
  private final AuthQueryService authQueryService;
  private final Clock clock;
  private final long refreshTokenTtlDays;

  public AuthCommandService(
      UserRepository userRepository,
      RefreshTokenRepository refreshTokenRepository,
      PasswordEncoder passwordEncoder,
      TokenProvider tokenProvider,
      AuthQueryService authQueryService,
      Clock clock,
      @Value("${app.auth.jwt.refresh-token-ttl-days:7}") long refreshTokenTtlDays
  ) {
    this.userRepository = userRepository;
    this.refreshTokenRepository = refreshTokenRepository;
    this.passwordEncoder = passwordEncoder;
    this.tokenProvider = tokenProvider;
    this.authQueryService = authQueryService;
    this.clock = clock;
    this.refreshTokenTtlDays = refreshTokenTtlDays;
  }

  @Transactional
  public LoginResult login(LoginCommand command) {
    String normalizedEmail = normalizeEmail(command.email());

    User user = userRepository.findByEmail(normalizedEmail)
        .orElseThrow(() -> new AuthException(UserErrorCode.AUTH_INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED));

    rejectInactiveAccount(user);

    if (!passwordEncoder.matches(command.password(), user.passwordHash())) {
      throw new AuthException(UserErrorCode.AUTH_INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED);
    }

    CurrentUser currentUser = authQueryService.buildCurrentUser(user);
    TokenPair tokenPair = tokenProvider.issueTokenPair(currentUser);
    persistRefreshToken(user, tokenPair.refreshToken());

    return new LoginResult(tokenPair, currentUser);
  }

  @Transactional
  public TokenPair refresh(RefreshTokenCommand command) {
    if (command.refreshToken() == null || command.refreshToken().isBlank()) {
      throw new AuthException(UserErrorCode.AUTH_REFRESH_TOKEN_MISSING, HttpStatus.UNAUTHORIZED);
    }

    String tokenHash = hashRefreshToken(command.refreshToken());
    RefreshToken oldToken = refreshTokenRepository.findByTokenHashForUpdate(tokenHash)
        .orElseThrow(() -> new AuthException(UserErrorCode.AUTH_REFRESH_TOKEN_INVALID, HttpStatus.UNAUTHORIZED));

    Instant now = Instant.now(clock);
    if (oldToken.isRevoked()) {
      log.warn("Rejected refresh token reuse for token id {}", oldToken.id());
      throw new AuthException(UserErrorCode.AUTH_REFRESH_TOKEN_REVOKED, HttpStatus.UNAUTHORIZED);
    }
    if (oldToken.isExpired(now)) {
      throw new AuthException(UserErrorCode.AUTH_REFRESH_TOKEN_EXPIRED, HttpStatus.UNAUTHORIZED);
    }

    User user = userRepository.findById(oldToken.userId())
        .orElseThrow(() -> new AuthException(UserErrorCode.AUTH_REFRESH_TOKEN_INVALID, HttpStatus.UNAUTHORIZED));

    rejectInactiveAccount(user);

    if (!refreshTokenRepository.revokeIfActive(oldToken.id(), now)) {
      log.warn("Rejected refresh token reuse for token id {}", oldToken.id());
      throw new AuthException(UserErrorCode.AUTH_REFRESH_TOKEN_REVOKED, HttpStatus.UNAUTHORIZED);
    }

    CurrentUser currentUser = authQueryService.buildCurrentUser(user);
    TokenPair newPair = tokenProvider.issueTokenPair(currentUser);
    RefreshToken newRefresh = persistRefreshToken(user, newPair.refreshToken());
    refreshTokenRepository.setReplacedByTokenId(oldToken.id(), newRefresh.id());

    return newPair;
  }

  @Transactional
  public void logout(LogoutCommand command) {
    if (command.refreshToken() == null || command.refreshToken().isBlank()) {
      return;
    }

    String tokenHash = hashRefreshToken(command.refreshToken());
    refreshTokenRepository.findByTokenHash(tokenHash)
        .ifPresent(token -> refreshTokenRepository.revoke(token.id(), Instant.now(clock)));
  }

  private RefreshToken persistRefreshToken(User user, String rawRefreshToken) {
    Instant expiresAt = Instant.now(clock).plus(refreshTokenTtlDays, ChronoUnit.DAYS);
    String tokenHash = hashRefreshToken(rawRefreshToken);
    return refreshTokenRepository.save(user.id(), tokenHash, expiresAt);
  }

  private String normalizeEmail(String email) {
    return email == null ? "" : email.trim().toLowerCase();
  }

  private void rejectInactiveAccount(User user) {
    if (user.accountStatus() == UserStatus.DISABLED) {
      throw new AuthException(UserErrorCode.AUTH_ACCOUNT_DISABLED, HttpStatus.FORBIDDEN);
    }
    if (user.accountStatus() == UserStatus.LOCKED) {
      throw new AuthException(UserErrorCode.AUTH_ACCOUNT_LOCKED, HttpStatus.FORBIDDEN);
    }
  }

  private String hashRefreshToken(String refreshToken) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hashed = digest.digest(refreshToken.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(hashed);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 algorithm unavailable", e);
    }
  }
}

