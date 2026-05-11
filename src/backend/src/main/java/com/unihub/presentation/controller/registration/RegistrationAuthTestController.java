package com.unihub.presentation.controller.registration;

import com.unihub.application.auth.exception.AuthException;
import com.unihub.application.registration.RegistrationQueryService;
import com.unihub.domain.user.UserErrorCode;
import com.unihub.infrastructure.security.UserPrincipal;
import com.unihub.presentation.ApiResponse;
import com.unihub.presentation.dto.response.registration.RegistrationResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/registrations")
public class RegistrationAuthTestController {
  private final RegistrationQueryService registrationQueryService;

  public RegistrationAuthTestController(RegistrationQueryService registrationQueryService) {
    this.registrationQueryService = registrationQueryService;
  }

  @GetMapping
  public ApiResponse<List<RegistrationResponse>> listMyRegistrations(Authentication authentication) {
    UUID userId = requireUserId(authentication);
    return ApiResponse.success(registrationQueryService.listForUser(userId));
  }

  @GetMapping("/auth-test")
  public ApiResponse<String> authTest() {
    return ApiResponse.success("registration ok");
  }

  private UUID requireUserId(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
      throw new AuthException(UserErrorCode.AUTH_TOKEN_MISSING, HttpStatus.UNAUTHORIZED);
    }
    return principal.id();
  }
}

