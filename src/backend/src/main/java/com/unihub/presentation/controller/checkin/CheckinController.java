package com.unihub.presentation.controller.checkin;

import com.unihub.application.auth.exception.AuthException;
import com.unihub.application.checkin.CheckinCommandService;
import com.unihub.application.checkin.CheckinQueryService;
import com.unihub.domain.user.UserErrorCode;
import com.unihub.infrastructure.security.UserPrincipal;
import com.unihub.presentation.ApiResponse;
import com.unihub.presentation.dto.request.checkin.CheckinSyncRequest;
import com.unihub.presentation.dto.request.checkin.CheckinValidateRequest;
import com.unihub.presentation.dto.response.checkin.CheckinHistoryResponse;
import com.unihub.presentation.dto.response.checkin.CheckinSessionResponse;
import com.unihub.presentation.dto.response.checkin.CheckinSyncResponse;
import com.unihub.presentation.dto.response.checkin.CheckinValidateResponse;
import com.unihub.presentation.mapper.checkin.CheckinResponseMapper;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/checkin")
public class CheckinController {
  private final CheckinQueryService checkinQueryService;
  private final CheckinCommandService checkinCommandService;
  private final CheckinResponseMapper checkinResponseMapper;

  public CheckinController(
      CheckinQueryService checkinQueryService,
      CheckinCommandService checkinCommandService,
      CheckinResponseMapper checkinResponseMapper) {
    this.checkinQueryService = checkinQueryService;
    this.checkinCommandService = checkinCommandService;
    this.checkinResponseMapper = checkinResponseMapper;
  }

  @GetMapping("/sessions")
  public ResponseEntity<ApiResponse<List<CheckinSessionResponse>>> sessions(Authentication authentication) {
    requireCheckinUser(authentication);
    List<CheckinSessionResponse> responses = checkinQueryService.getSessions().stream()
        .map(checkinResponseMapper::toSessionResponse)
        .toList();
    return ResponseEntity.ok(ApiResponse.success(responses));
  }

  @GetMapping("/history")
  public ResponseEntity<ApiResponse<List<CheckinHistoryResponse>>> history(Authentication authentication) {
    UUID userId = requireCheckinUser(authentication);
    return ResponseEntity.ok(ApiResponse.success(checkinQueryService.listHistoryForStaff(userId)));
  }

  @PostMapping("/validate")
  public ResponseEntity<ApiResponse<CheckinValidateResponse>> validate(
      Authentication authentication,
      @Valid @RequestBody CheckinValidateRequest request) {
    UUID userId = requireCheckinUser(authentication);
    CheckinValidateResponse response = checkinResponseMapper.toValidateResponse(
        checkinCommandService.validate(userId, checkinResponseMapper.toValidateCommand(request)));
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @PostMapping("/sync")
  public ResponseEntity<ApiResponse<CheckinSyncResponse>> sync(
      Authentication authentication,
      @Valid @RequestBody CheckinSyncRequest request) {
    UUID userId = requireCheckinUser(authentication);
    CheckinSyncResponse response = checkinResponseMapper.toSyncResponse(
        checkinCommandService.sync(userId, checkinResponseMapper.toSyncCommand(request)));
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  private UUID requireCheckinUser(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
      throw new AuthException(UserErrorCode.AUTH_TOKEN_MISSING, HttpStatus.UNAUTHORIZED);
    }
    boolean allowed = principal.roles().stream().anyMatch(role -> "checkin_staff".equalsIgnoreCase(role));
    if (!allowed) {
      throw new AuthException(UserErrorCode.AUTH_FORBIDDEN, HttpStatus.FORBIDDEN);
    }
    return principal.id();
  }
}
