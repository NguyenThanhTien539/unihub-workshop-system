package com.unihub.presentation.controller.admin;

import com.unihub.application.auth.exception.AuthException;
import com.unihub.application.workshop.CreateSessionCommand;
import com.unihub.application.workshop.WorkshopCommandService;
import com.unihub.application.workshop.WorkshopQueryService;
import com.unihub.domain.user.UserErrorCode;
import com.unihub.domain.workshop.Workshop;
import com.unihub.domain.workshop.WorkshopSession;
import com.unihub.domain.workshop.WorkshopStatus;
import com.unihub.infrastructure.security.UserPrincipal;
import com.unihub.presentation.ApiResponse;
import com.unihub.presentation.dto.request.workshop.CreateWorkshopRequest;
import com.unihub.presentation.dto.request.workshop.CreateWorkshopSessionRequest;
import com.unihub.presentation.dto.request.workshop.UpdateWorkshopRequest;
import com.unihub.presentation.dto.request.workshop.UpdateWorkshopSessionRequest;
import com.unihub.presentation.dto.response.workshop.WorkshopDetailResponse;
import com.unihub.presentation.dto.response.workshop.WorkshopSessionResponse;
import com.unihub.presentation.mapper.admin.AdminWorkshopRequestMapper;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminWorkshopController {
  private final WorkshopCommandService workshopCommandService;
  private final WorkshopQueryService workshopQueryService;
  private final AdminWorkshopRequestMapper adminWorkshopRequestMapper;

  public AdminWorkshopController(
      WorkshopCommandService workshopCommandService,
      WorkshopQueryService workshopQueryService,
      AdminWorkshopRequestMapper adminWorkshopRequestMapper) {
    this.workshopCommandService = workshopCommandService;
    this.workshopQueryService = workshopQueryService;
    this.adminWorkshopRequestMapper = adminWorkshopRequestMapper;
  }

  @GetMapping("/workshops")
  public ApiResponse<List<WorkshopDetailResponse>> listWorkshops(
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) WorkshopStatus status,
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer size) {
    List<WorkshopDetailResponse> responses = workshopQueryService.listAdminWorkshops(keyword, status, page, size);
    return ApiResponse.success(responses);
  }

  @GetMapping("/workshops/{workshopId}")
  public ApiResponse<WorkshopDetailResponse> getWorkshopDetail(@PathVariable UUID workshopId) {
    WorkshopDetailResponse response = workshopQueryService.getAdminWorkshopDetail(workshopId);
    return ApiResponse.success(response);
  }

  @PostMapping("/workshops")
  public ResponseEntity<ApiResponse<WorkshopDetailResponse>> createWorkshop(
      Authentication authentication,
      @Valid @RequestBody CreateWorkshopRequest request) {
    UUID userId = requireUserId(authentication);
    List<CreateSessionCommand> sessions = adminWorkshopRequestMapper.toCreateSessionCommands(request.sessions(), null);

    Workshop workshop = workshopCommandService.createWorkshop(
        adminWorkshopRequestMapper.toCreateWorkshopCommand(request, userId, sessions));

    WorkshopDetailResponse response = workshopQueryService.getAdminWorkshopDetail(workshop.id());
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @PatchMapping("/workshops/{workshopId}")
  public ResponseEntity<ApiResponse<WorkshopDetailResponse>> updateWorkshop(
      @PathVariable UUID workshopId,
      @RequestBody UpdateWorkshopRequest request) {
    workshopCommandService.updateWorkshop(
        adminWorkshopRequestMapper.toUpdateWorkshopCommand(workshopId, request));

    WorkshopDetailResponse response = workshopQueryService.getAdminWorkshopDetail(workshopId);
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @PostMapping("/workshops/{workshopId}/publish")
  public ResponseEntity<ApiResponse<WorkshopDetailResponse>> publishWorkshop(@PathVariable UUID workshopId) {
    workshopCommandService.publishWorkshop(workshopId);
    WorkshopDetailResponse response = workshopQueryService.getAdminWorkshopDetail(workshopId);
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @PostMapping("/workshops/{workshopId}/cancel")
  public ResponseEntity<ApiResponse<WorkshopDetailResponse>> cancelWorkshop(@PathVariable UUID workshopId) {
    workshopCommandService.cancelWorkshop(workshopId);
    WorkshopDetailResponse response = workshopQueryService.getAdminWorkshopDetail(workshopId);
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @PostMapping("/workshops/{workshopId}/sessions")
  public ResponseEntity<ApiResponse<WorkshopSessionResponse>> createSession(
      @PathVariable UUID workshopId,
      @Valid @RequestBody CreateWorkshopSessionRequest request) {
    WorkshopSession session = workshopCommandService.createSession(
        adminWorkshopRequestMapper.toCreateSessionCommand(workshopId, request));

    WorkshopSessionResponse response = workshopQueryService.getSessionResponse(session.id());
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @PatchMapping("/sessions/{sessionId}")
  public ResponseEntity<ApiResponse<WorkshopSessionResponse>> updateSession(
      @PathVariable UUID sessionId,
      @RequestBody UpdateWorkshopSessionRequest request) {
    workshopCommandService.updateSession(
        adminWorkshopRequestMapper.toUpdateSessionCommand(sessionId, request));

    WorkshopSessionResponse response = workshopQueryService.getSessionResponse(sessionId);
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @PostMapping("/sessions/{sessionId}/cancel")
  public ResponseEntity<ApiResponse<WorkshopSessionResponse>> cancelSession(@PathVariable UUID sessionId) {
    workshopCommandService.cancelSession(sessionId);
    WorkshopSessionResponse response = workshopQueryService.getSessionResponse(sessionId);
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  private UUID requireUserId(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
      throw new AuthException(UserErrorCode.AUTH_TOKEN_MISSING, HttpStatus.UNAUTHORIZED);
    }
    return principal.id();
  }

}
