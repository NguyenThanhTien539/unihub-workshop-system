package com.unihub.presentation.controller.checkin;

import com.unihub.application.auth.exception.AuthException;
import com.unihub.application.checkin.CheckinQueryService;
import com.unihub.domain.user.UserErrorCode;
import com.unihub.infrastructure.security.UserPrincipal;
import com.unihub.presentation.ApiResponse;
import com.unihub.presentation.dto.response.checkin.CheckinHistoryResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/checkin")
public class CheckinAuthTestController {
  private final CheckinQueryService checkinQueryService;

  public CheckinAuthTestController(CheckinQueryService checkinQueryService) {
    this.checkinQueryService = checkinQueryService;
  }

  @GetMapping("/history")
  public ApiResponse<List<CheckinHistoryResponse>> listHistory(Authentication authentication) {
    UUID userId = requireUserId(authentication);
    return ApiResponse.success(checkinQueryService.listHistoryForStaff(userId));
  }

  @GetMapping("/auth-test")
  public ApiResponse<String> authTest() {
    return ApiResponse.success("checkin ok");
  }

  private UUID requireUserId(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
      throw new AuthException(UserErrorCode.AUTH_TOKEN_MISSING, HttpStatus.UNAUTHORIZED);
    }
    return principal.id();
  }
}

