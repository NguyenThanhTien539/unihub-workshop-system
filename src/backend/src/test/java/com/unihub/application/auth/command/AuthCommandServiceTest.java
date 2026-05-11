package com.unihub.application.auth.command;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.unihub.application.auth.exception.AuthException;
import com.unihub.application.auth.model.CurrentUser;
import com.unihub.application.auth.model.LoginResult;
import com.unihub.application.auth.model.TokenPair;
import com.unihub.application.auth.port.TokenProvider;
import com.unihub.application.auth.query.AuthQueryService;
import com.unihub.domain.auth.RefreshToken;
import com.unihub.domain.auth.RefreshTokenRepository;
import com.unihub.domain.role.RoleRepository;
import com.unihub.domain.student.Student;
import com.unihub.domain.student.StudentRepository;
import com.unihub.domain.student.StudentStatus;
import com.unihub.domain.user.User;
import com.unihub.domain.user.UserErrorCode;
import com.unihub.domain.user.UserRepository;
import com.unihub.domain.user.UserStatus;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(OutputCaptureExtension.class)
class AuthCommandServiceTest {
  private static final String PASSWORD = "Password123!";
  private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-05-10T08:00:00Z"), ZoneOffset.UTC);

  private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
  private FakeUserRepository userRepository;
  private FakeRoleRepository roleRepository;
  private FakeStudentRepository studentRepository;
  private FakeRefreshTokenRepository refreshTokenRepository;
  private FakeTokenProvider tokenProvider;
  private AuthCommandService service;

  private final UUID studentUserId = UUID.fromString("20000000-0000-0000-0000-000000000001");
  private final UUID organizerUserId = UUID.fromString("20000000-0000-0000-0000-000000000002");
  private final UUID checkinUserId = UUID.fromString("20000000-0000-0000-0000-000000000003");
  private final UUID disabledUserId = UUID.fromString("20000000-0000-0000-0000-000000000004");
  private final UUID lockedUserId = UUID.fromString("20000000-0000-0000-0000-000000000005");

  @BeforeEach
  void setUp() {
    userRepository = new FakeUserRepository();
    roleRepository = new FakeRoleRepository();
    studentRepository = new FakeStudentRepository();
    refreshTokenRepository = new FakeRefreshTokenRepository(CLOCK);
    tokenProvider = new FakeTokenProvider();

    userRepository.put(new User(studentUserId, "student1@university.edu.vn", passwordEncoder.encode(PASSWORD),
        "Student One", UserStatus.ACTIVE));
    userRepository.put(new User(organizerUserId, "organizer@university.edu.vn", passwordEncoder.encode(PASSWORD),
        "Organizer One", UserStatus.ACTIVE));
    userRepository.put(new User(checkinUserId, "checkin@university.edu.vn", passwordEncoder.encode(PASSWORD),
        "Check-in Staff One", UserStatus.ACTIVE));
    userRepository.put(new User(disabledUserId, "disabled@university.edu.vn", passwordEncoder.encode(PASSWORD),
        "Disabled User", UserStatus.DISABLED));
    userRepository.put(new User(lockedUserId, "locked@university.edu.vn", passwordEncoder.encode(PASSWORD),
        "Locked User", UserStatus.LOCKED));

    roleRepository.roles.put(studentUserId, List.of("student"));
    roleRepository.roles.put(organizerUserId, List.of("organizer"));
    roleRepository.roles.put(checkinUserId, List.of("checkin_staff"));
    roleRepository.roles.put(disabledUserId, List.of("student"));
    roleRepository.roles.put(lockedUserId, List.of("student"));

    studentRepository.students.put(studentUserId, new Student(
        UUID.fromString("40000000-0000-0000-0000-000000000001"),
        studentUserId,
        "23123456",
        "Software Engineering",
        "Software Engineering",
        "SE-2025",
        StudentStatus.ACTIVE));

    AuthQueryService authQueryService = new AuthQueryService(userRepository, roleRepository, studentRepository);
    service = new AuthCommandService(
        userRepository,
        refreshTokenRepository,
        passwordEncoder,
        tokenProvider,
        authQueryService,
        CLOCK,
        7);
  }

  @Test
  void validStudentLoginReturnsTokensRolesAndStudentProfile(CapturedOutput output) {
    LoginResult result = service.login(new LoginCommand("  STUDENT1@UNIVERSITY.EDU.VN  ", PASSWORD));

    assertThat(result.token().accessToken()).startsWith("access-");
    assertThat(result.token().refreshToken()).startsWith("refresh-");
    assertThat(result.token().expiresIn()).isEqualTo(900);
    assertThat(result.user().roles()).containsExactly("student");
    assertThat(result.user().studentProfile()).isNotNull();
    assertThat(result.user().studentProfile().studentCode()).isEqualTo("23123456");
    assertThat(refreshTokenRepository.tokens).hasSize(1);
    assertThat(refreshTokenRepository.tokens.values().iterator().next().tokenHash())
        .isNotEqualTo(result.token().refreshToken());
    assertThat(output.toString()).doesNotContain(PASSWORD);
  }

  @Test
  void validOrganizerLoginReturnsOrganizerRole() {
    LoginResult result = service.login(new LoginCommand("organizer@university.edu.vn", PASSWORD));

    assertThat(result.user().roles()).containsExactly("organizer");
    assertThat(result.user().studentProfile()).isNull();
  }

  @Test
  void validCheckinStaffLoginReturnsCheckinStaffRole() {
    LoginResult result = service.login(new LoginCommand("checkin@university.edu.vn", PASSWORD));

    assertThat(result.user().roles()).containsExactly("checkin_staff");
    assertThat(result.user().studentProfile()).isNull();
  }

  @Test
  void wrongPasswordReturnsInvalidCredentials() {
    assertAuthFailure(
        () -> service.login(new LoginCommand("student1@university.edu.vn", "wrong")),
        HttpStatus.UNAUTHORIZED,
        UserErrorCode.AUTH_INVALID_CREDENTIALS);
  }

  @Test
  void unknownEmailReturnsInvalidCredentialsWithoutRevealingExistence() {
    assertAuthFailure(
        () -> service.login(new LoginCommand("missing@university.edu.vn", PASSWORD)),
        HttpStatus.UNAUTHORIZED,
        UserErrorCode.AUTH_INVALID_CREDENTIALS);
  }

  @Test
  void disabledAccountReturnsForbidden() {
    assertAuthFailure(
        () -> service.login(new LoginCommand("disabled@university.edu.vn", PASSWORD)),
        HttpStatus.FORBIDDEN,
        UserErrorCode.AUTH_ACCOUNT_DISABLED);
  }

  @Test
  void lockedAccountReturnsForbidden() {
    assertAuthFailure(
        () -> service.login(new LoginCommand("locked@university.edu.vn", PASSWORD)),
        HttpStatus.FORBIDDEN,
        UserErrorCode.AUTH_ACCOUNT_LOCKED);
  }

  @Test
  void validRefreshRotatesTokenAndRevokesOldToken() {
    LoginResult login = service.login(new LoginCommand("student1@university.edu.vn", PASSWORD));

    TokenPair refreshed = service.refresh(new RefreshTokenCommand(login.token().refreshToken()));

    RefreshToken oldToken = refreshTokenRepository.findByTokenHash(hash(login.token().refreshToken())).orElseThrow();
    assertThat(refreshed.accessToken()).startsWith("access-");
    assertThat(refreshed.refreshToken()).isNotEqualTo(login.token().refreshToken());
    assertThat(oldToken.revokedAt()).isNotNull();
    assertThat(oldToken.replacedByTokenId()).isNotNull();
  }

  @Test
  void reusingOldRefreshTokenReturnsRevoked() {
    LoginResult login = service.login(new LoginCommand("student1@university.edu.vn", PASSWORD));
    service.refresh(new RefreshTokenCommand(login.token().refreshToken()));

    assertAuthFailure(
        () -> service.refresh(new RefreshTokenCommand(login.token().refreshToken())),
        HttpStatus.UNAUTHORIZED,
        UserErrorCode.AUTH_REFRESH_TOKEN_REVOKED);
  }

  @Test
  void expiredRefreshTokenReturnsExpired() {
    RefreshToken token = refreshTokenRepository.insert(studentUserId, "expired-refresh", CLOCK.instant().minusSeconds(1));

    assertAuthFailure(
        () -> service.refresh(new RefreshTokenCommand("expired-refresh")),
        HttpStatus.UNAUTHORIZED,
        UserErrorCode.AUTH_REFRESH_TOKEN_EXPIRED);
    assertThat(token).isNotNull();
  }

  @Test
  void invalidRefreshTokenReturnsInvalid() {
    assertAuthFailure(
        () -> service.refresh(new RefreshTokenCommand("not-a-token")),
        HttpStatus.UNAUTHORIZED,
        UserErrorCode.AUTH_REFRESH_TOKEN_INVALID);
  }

  @Test
  void missingRefreshTokenReturnsMissing() {
    assertAuthFailure(
        () -> service.refresh(new RefreshTokenCommand(" ")),
        HttpStatus.UNAUTHORIZED,
        UserErrorCode.AUTH_REFRESH_TOKEN_MISSING);
  }

  @Test
  void refreshForDisabledUserReturnsAccountDisabled() {
    refreshTokenRepository.insert(disabledUserId, "disabled-refresh", CLOCK.instant().plusSeconds(3600));

    assertAuthFailure(
        () -> service.refresh(new RefreshTokenCommand("disabled-refresh")),
        HttpStatus.FORBIDDEN,
        UserErrorCode.AUTH_ACCOUNT_DISABLED);
  }

  @Test
  void refreshForLockedUserReturnsAccountLocked() {
    refreshTokenRepository.insert(lockedUserId, "locked-refresh", CLOCK.instant().plusSeconds(3600));

    assertAuthFailure(
        () -> service.refresh(new RefreshTokenCommand("locked-refresh")),
        HttpStatus.FORBIDDEN,
        UserErrorCode.AUTH_ACCOUNT_LOCKED);
  }

  @Test
  void concurrentRefreshSameTokenAllowsOnlyOneSuccess() throws Exception {
    LoginResult login = service.login(new LoginCommand("student1@university.edu.vn", PASSWORD));
    int workers = 8;
    CountDownLatch ready = new CountDownLatch(workers);
    CountDownLatch start = new CountDownLatch(1);
    AtomicInteger success = new AtomicInteger();
    AtomicInteger rejected = new AtomicInteger();
    var executor = Executors.newFixedThreadPool(workers);
    List<Callable<Void>> tasks = new ArrayList<>();

    for (int i = 0; i < workers; i++) {
      tasks.add(() -> {
        ready.countDown();
        start.await(5, TimeUnit.SECONDS);
        try {
          service.refresh(new RefreshTokenCommand(login.token().refreshToken()));
          success.incrementAndGet();
        } catch (AuthException ex) {
          if (ex.getErrorCode() == UserErrorCode.AUTH_REFRESH_TOKEN_REVOKED) {
            rejected.incrementAndGet();
          } else {
            throw ex;
          }
        }
        return null;
      });
    }

    var futures = tasks.stream().map(executor::submit).toList();
    assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
    start.countDown();
    for (var future : futures) {
      future.get(5, TimeUnit.SECONDS);
    }
    executor.shutdownNow();

    assertThat(success.get()).isEqualTo(1);
    assertThat(rejected.get()).isEqualTo(workers - 1);
  }

  @Test
  void logoutRevokesExistingTokenAndIsIdempotent() {
    LoginResult login = service.login(new LoginCommand("student1@university.edu.vn", PASSWORD));

    service.logout(new LogoutCommand(login.token().refreshToken()));
    service.logout(new LogoutCommand(login.token().refreshToken()));
    service.logout(new LogoutCommand("not-a-token"));

    RefreshToken token = refreshTokenRepository.findByTokenHash(hash(login.token().refreshToken())).orElseThrow();
    assertThat(token.revokedAt()).isNotNull();
  }

  private void assertAuthFailure(ThrowingCallable callable, HttpStatus status, UserErrorCode code) {
    assertThatThrownBy(callable::call)
        .isInstanceOf(AuthException.class)
        .satisfies(ex -> {
          AuthException authException = (AuthException) ex;
          assertThat(authException.getStatus()).isEqualTo(status);
          assertThat(authException.getErrorCode()).isEqualTo(code);
        });
  }

  private static String hash(String raw) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception ex) {
      throw new IllegalStateException(ex);
    }
  }

  @FunctionalInterface
  private interface ThrowingCallable {
    void call();
  }

  private static class FakeUserRepository implements UserRepository {
    private final Map<UUID, User> usersById = new java.util.concurrent.ConcurrentHashMap<>();
    private final Map<String, User> usersByEmail = new java.util.concurrent.ConcurrentHashMap<>();

    void put(User user) {
      usersById.put(user.id(), user);
      usersByEmail.put(user.email(), user);
    }

    @Override
    public Optional<User> findByEmail(String email) {
      return Optional.ofNullable(usersByEmail.get(email.toLowerCase().trim()));
    }

    @Override
    public Optional<User> findById(UUID id) {
      return Optional.ofNullable(usersById.get(id));
    }
  }

  private static class FakeRoleRepository implements RoleRepository {
    private final Map<UUID, List<String>> roles = new java.util.concurrent.ConcurrentHashMap<>();

    @Override
    public List<String> findRoleNamesByUserId(UUID userId) {
      return roles.getOrDefault(userId, List.of());
    }
  }

  private static class FakeStudentRepository implements StudentRepository {
    private final Map<UUID, Student> students = new java.util.concurrent.ConcurrentHashMap<>();

    @Override
    public Optional<Student> findByUserId(UUID userId) {
      return Optional.ofNullable(students.get(userId));
    }
  }

  private static class FakeRefreshTokenRepository implements RefreshTokenRepository {
    private final Map<String, RefreshToken> tokens = new java.util.concurrent.ConcurrentHashMap<>();
    private final Clock clock;

    FakeRefreshTokenRepository(Clock clock) {
      this.clock = clock;
    }

    @Override
    public Optional<RefreshToken> findByTokenHash(String tokenHash) {
      return Optional.ofNullable(tokens.get(tokenHash));
    }

    @Override
    public Optional<RefreshToken> findByTokenHashForUpdate(String tokenHash) {
      return findByTokenHash(tokenHash);
    }

    @Override
    public synchronized RefreshToken save(UUID userId, String tokenHash, Instant expiresAt) {
      RefreshToken token = new RefreshToken(UUID.randomUUID(), userId, tokenHash, expiresAt, null, clock.instant(), null);
      tokens.put(tokenHash, token);
      return token;
    }

    RefreshToken insert(UUID userId, String rawToken, Instant expiresAt) {
      return save(userId, hash(rawToken), expiresAt);
    }

    @Override
    public synchronized void revoke(UUID id, Instant revokedAt) {
      revokeIfActive(id, revokedAt);
    }

    @Override
    public synchronized boolean revokeIfActive(UUID id, Instant revokedAt) {
      for (Map.Entry<String, RefreshToken> entry : tokens.entrySet()) {
        RefreshToken token = entry.getValue();
        if (token.id().equals(id)) {
          if (token.revokedAt() != null) {
            return false;
          }
          tokens.put(entry.getKey(), new RefreshToken(
              token.id(),
              token.userId(),
              token.tokenHash(),
              token.expiresAt(),
              revokedAt,
              token.createdAt(),
              token.replacedByTokenId()));
          return true;
        }
      }
      return false;
    }

    @Override
    public synchronized void setReplacedByTokenId(UUID id, UUID replacedByTokenId) {
      for (Map.Entry<String, RefreshToken> entry : tokens.entrySet()) {
        RefreshToken token = entry.getValue();
        if (token.id().equals(id)) {
          tokens.put(entry.getKey(), new RefreshToken(
              token.id(),
              token.userId(),
              token.tokenHash(),
              token.expiresAt(),
              token.revokedAt(),
              token.createdAt(),
              replacedByTokenId));
          return;
        }
      }
    }
  }

  private static class FakeTokenProvider implements TokenProvider {
    private final AtomicInteger sequence = new AtomicInteger();

    @Override
    public TokenPair issueTokenPair(CurrentUser user) {
      int value = sequence.incrementAndGet();
      return new TokenPair("access-" + value, "refresh-" + value, 900);
    }
  }
}
