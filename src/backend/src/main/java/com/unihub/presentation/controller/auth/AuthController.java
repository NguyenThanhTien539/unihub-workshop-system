package com.unihub.presentation.controller.auth;

import com.unihub.application.auth.command.AuthCommandService;
import com.unihub.application.auth.exception.AuthException;
import com.unihub.application.auth.query.AuthQueryService;
import com.unihub.application.auth.model.CurrentUser;
import com.unihub.application.auth.command.LoginCommand;
import com.unihub.application.auth.model.LoginResult;
import com.unihub.application.auth.command.LogoutCommand;
import com.unihub.application.auth.command.RefreshTokenCommand;
import com.unihub.application.auth.model.TokenPair;
import com.unihub.domain.user.UserErrorCode;
import com.unihub.infrastructure.security.UserPrincipal;
import com.unihub.presentation.ApiResponse;
import com.unihub.presentation.dto.request.auth.LoginRequest;
import com.unihub.presentation.dto.request.auth.LogoutRequest;
import com.unihub.presentation.dto.request.auth.RefreshTokenRequest;
import com.unihub.presentation.dto.response.auth.AuthResponse;
import com.unihub.presentation.dto.response.auth.MeResponse;
import com.unihub.presentation.dto.response.auth.StudentProfileResponse;
import com.unihub.presentation.dto.response.auth.TokenResponse;
import com.unihub.presentation.dto.response.auth.UserResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthCommandService authCommandService;
  private final AuthQueryService authQueryService;

  public AuthController(AuthCommandService authCommandService, AuthQueryService authQueryService) {
    this.authCommandService = authCommandService;
    this.authQueryService = authQueryService;
  }

  @PostMapping("/login")
  public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
    LoginResult result = authCommandService.login(new LoginCommand(request.email(), request.password()));
    AuthResponse response = new AuthResponse(
        result.token().accessToken(),
        result.token().refreshToken(),
        result.token().expiresIn(),
        result.user().roles()
    );
    return ApiResponse.success(response);
  }

  @PostMapping("/refresh")
  public ApiResponse<TokenResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
    TokenPair tokenPair = authCommandService.refresh(new RefreshTokenCommand(request.refreshToken()));
    TokenResponse response = new TokenResponse(
        tokenPair.accessToken(),
        tokenPair.refreshToken(),
        tokenPair.expiresIn()
    );
    return ApiResponse.success(response);
  }

  @PostMapping("/logout")
  public ApiResponse<Void> logout(@Valid @RequestBody LogoutRequest request) {
    authCommandService.logout(new LogoutCommand(request.refreshToken()));
    return ApiResponse.success(null);
  }

  @GetMapping("/me")
  public ApiResponse<MeResponse> me(org.springframework.security.core.Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
      throw new AuthException(UserErrorCode.AUTH_TOKEN_MISSING, HttpStatus.UNAUTHORIZED);
    }

    CurrentUser user = authQueryService.getCurrentUser(principal.id());
    return ApiResponse.success(new MeResponse(toUserResponse(user)));
  }

  private UserResponse toUserResponse(CurrentUser currentUser) {
    StudentProfileResponse profile = currentUser.studentProfile() == null
        ? null
        : new StudentProfileResponse(
            currentUser.studentProfile().studentId(),
            currentUser.studentProfile().studentCode(),
            currentUser.studentProfile().status()
        );

    return new UserResponse(
        currentUser.id(),
        currentUser.email(),
        currentUser.fullName(),
        currentUser.roles(),
        profile
    );
  }
}

