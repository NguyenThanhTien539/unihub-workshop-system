package com.unihub.presentation.controller.auth;

import com.unihub.application.auth.command.AuthCommandService;
import com.unihub.application.auth.exception.AuthException;
import com.unihub.application.auth.query.AuthQueryService;
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
import com.unihub.presentation.dto.response.auth.TokenResponse;
import com.unihub.presentation.mapper.auth.AuthResponseMapper;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
  private final AuthResponseMapper authResponseMapper;

  public AuthController(
      AuthCommandService authCommandService,
      AuthQueryService authQueryService,
      AuthResponseMapper authResponseMapper) {
    this.authCommandService = authCommandService;
    this.authQueryService = authQueryService;
    this.authResponseMapper = authResponseMapper;
  }

  @PostMapping("/login")
  public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
    LoginResult result = authCommandService.login(new LoginCommand(request.email(), request.password()));
    return ResponseEntity.ok(ApiResponse.success(authResponseMapper.toAuthResponse(result)));
  }

  @PostMapping("/refresh")
  public ResponseEntity<ApiResponse<TokenResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
    TokenPair tokenPair = authCommandService.refresh(new RefreshTokenCommand(request.refreshToken()));
    return ResponseEntity.ok(ApiResponse.success(authResponseMapper.toTokenResponse(tokenPair)));
  }

  @PostMapping("/logout")
  public ResponseEntity<ApiResponse<Void>> logout(@Valid @RequestBody LogoutRequest request) {
    authCommandService.logout(new LogoutCommand(request.refreshToken()));
    return ResponseEntity.ok(ApiResponse.success(null));
  }

  @GetMapping("/me")
  public ResponseEntity<ApiResponse<MeResponse>> me(org.springframework.security.core.Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
      throw new AuthException(UserErrorCode.AUTH_TOKEN_MISSING, HttpStatus.UNAUTHORIZED);
    }

    var user = authQueryService.getCurrentUser(principal.id());
    return ResponseEntity.ok(ApiResponse.success(authResponseMapper.toMeResponse(user)));
  }
}
