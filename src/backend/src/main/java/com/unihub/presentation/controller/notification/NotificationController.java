package com.unihub.presentation.controller.notification;

import com.unihub.application.auth.exception.AuthException;
import com.unihub.application.notification.NotificationCommandService;
import com.unihub.application.notification.NotificationQueryService;
import com.unihub.domain.user.UserErrorCode;
import com.unihub.infrastructure.security.UserPrincipal;
import com.unihub.presentation.ApiResponse;
import com.unihub.presentation.dto.response.notification.MarkNotificationReadResponse;
import com.unihub.presentation.dto.response.notification.NotificationResponse;
import com.unihub.presentation.mapper.notification.NotificationResponseMapper;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
  private final NotificationQueryService queryService;
  private final NotificationCommandService commandService;
  private final NotificationResponseMapper responseMapper;

  public NotificationController(
      NotificationQueryService queryService,
      NotificationCommandService commandService,
      NotificationResponseMapper responseMapper) {
    this.queryService = queryService;
    this.commandService = commandService;
    this.responseMapper = responseMapper;
  }

  @GetMapping("/me")
  public ResponseEntity<ApiResponse<List<NotificationResponse>>> myNotifications(Authentication authentication) {
    List<NotificationResponse> responses = queryService.getMyNotifications(requireUserId(authentication))
        .stream()
        .map(responseMapper::toResponse)
        .toList();
    return ResponseEntity.ok(ApiResponse.success(responses));
  }

  @PatchMapping("/{notificationId}/read")
  public ResponseEntity<ApiResponse<MarkNotificationReadResponse>> markRead(
      Authentication authentication,
      @PathVariable UUID notificationId) {
    MarkNotificationReadResponse response = responseMapper.toReadResponse(
        commandService.markRead(requireUserId(authentication), notificationId));
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  private UUID requireUserId(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
      throw new AuthException(UserErrorCode.AUTH_TOKEN_MISSING, HttpStatus.UNAUTHORIZED);
    }
    return principal.id();
  }
}
