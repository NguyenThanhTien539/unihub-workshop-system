package com.unihub.presentation.controller.auth;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.unihub.application.auth.command.AuthCommandService;
import com.unihub.application.auth.command.LoginCommand;
import com.unihub.application.auth.model.CurrentUser;
import com.unihub.application.auth.model.LoginResult;
import com.unihub.application.auth.model.TokenPair;
import com.unihub.application.auth.query.AuthQueryService;
import com.unihub.infrastructure.security.UserPrincipal;
import com.unihub.presentation.mapper.auth.AuthResponseMapper;
import com.unihub.presentation.error.GlobalExceptionHandler;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class AuthControllerTest {
  private final ObjectMapper objectMapper = new ObjectMapper();
  private StubAuthCommandService authCommandService;
  private StubAuthQueryService authQueryService;
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    authCommandService = new StubAuthCommandService();
    authQueryService = new StubAuthQueryService();
    mockMvc = MockMvcBuilders
        .standaloneSetup(new AuthController(authCommandService, authQueryService, new AuthResponseMapper()))
        .setControllerAdvice(new GlobalExceptionHandler())
        .build();
  }

  @Test
  void loginResponseContainsUserAndNoSensitiveFields() throws Exception {
    CurrentUser user = studentUser();
    authCommandService.loginResult = new LoginResult(new TokenPair("access-token", "refresh-token", 900), user);

    mockMvc.perform(post("/api/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(Map.of(
            "email", "student1@university.edu.vn",
            "password", "Password123!"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.accessToken").value("access-token"))
        .andExpect(jsonPath("$.data.refreshToken").value("refresh-token"))
        .andExpect(jsonPath("$.data.expiresIn").value(900))
        .andExpect(jsonPath("$.data.user.email").value("student1@university.edu.vn"))
        .andExpect(jsonPath("$.data.user.accountStatus").value("ACTIVE"))
        .andExpect(jsonPath("$.data.user.roles[0]").value("student"))
        .andExpect(jsonPath("$.data.user.studentProfile.studentCode").value("23123456"))
        .andExpect(content().string(not(containsString("passwordHash"))))
        .andExpect(content().string(not(containsString("tokenHash"))));
  }

  @Test
  void meReturnsFlattenedCurrentUser() throws Exception {
    CurrentUser user = studentUser();
    authQueryService.currentUser = user;
    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
        new UserPrincipal(user.id(), user.email(), user.roles()),
        "access-token");

    mockMvc.perform(get("/api/auth/me").principal(auth))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(user.id().toString()))
        .andExpect(jsonPath("$.data.email").value("student1@university.edu.vn"))
        .andExpect(jsonPath("$.data.accountStatus").value("ACTIVE"))
        .andExpect(jsonPath("$.data.roles[0]").value("student"))
        .andExpect(jsonPath("$.data.studentProfile.studentCode").value("23123456"));
  }

  @Test
  void meReturnsNullStudentProfileForOrganizer() throws Exception {
    UUID id = UUID.fromString("20000000-0000-0000-0000-000000000002");
    CurrentUser user = new CurrentUser(
        id,
        "organizer@university.edu.vn",
        "Organizer One",
        "ACTIVE",
        List.of("organizer"),
        null);
    authQueryService.currentUser = user;
    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
        new UserPrincipal(id, user.email(), user.roles()),
        "access-token");

    mockMvc.perform(get("/api/auth/me").principal(auth))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.roles[0]").value("organizer"))
        .andExpect(jsonPath("$.data.studentProfile").value(nullValue()));
  }

  private CurrentUser studentUser() {
    UUID userId = UUID.fromString("20000000-0000-0000-0000-000000000001");
    return new CurrentUser(
        userId,
        "student1@university.edu.vn",
        "Student One",
        "ACTIVE",
        List.of("student"),
        new CurrentUser.StudentProfile(
            UUID.fromString("40000000-0000-0000-0000-000000000001"),
            "23123456",
            "Software Engineering",
            "Software Engineering",
            "SE-2025",
            "ACTIVE"));
  }

  private static class StubAuthCommandService extends AuthCommandService {
    private LoginResult loginResult;

    StubAuthCommandService() {
      super(null, null, null, null, null, Clock.systemUTC(), 7);
    }

    @Override
    public LoginResult login(LoginCommand command) {
      return loginResult;
    }
  }

  private static class StubAuthQueryService extends AuthQueryService {
    private CurrentUser currentUser;

    StubAuthQueryService() {
      super(null, null, null);
    }

    @Override
    public CurrentUser getCurrentUser(UUID userId) {
      return currentUser;
    }
  }
}
