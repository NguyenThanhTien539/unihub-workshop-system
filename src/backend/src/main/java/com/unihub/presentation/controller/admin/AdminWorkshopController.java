package com.unihub.presentation.controller.admin;

import com.unihub.application.auth.exception.AuthException;
import com.unihub.application.workshop.CreateSessionCommand;
import com.unihub.application.workshop.CreateWorkshopCommand;
import com.unihub.application.workshop.UpdateSessionCommand;
import com.unihub.application.workshop.UpdateWorkshopCommand;
import com.unihub.application.workshop.WorkshopCommandService;
import com.unihub.application.workshop.WorkshopQueryService;
import com.unihub.domain.user.UserErrorCode;
import com.unihub.domain.workshop.Workshop;
import com.unihub.domain.workshop.WorkshopSession;
import com.unihub.infrastructure.security.UserPrincipal;
import com.unihub.presentation.ApiResponse;
import com.unihub.presentation.dto.request.workshop.CreateWorkshopRequest;
import com.unihub.presentation.dto.request.workshop.CreateWorkshopSessionRequest;
import com.unihub.presentation.dto.request.workshop.UpdateWorkshopRequest;
import com.unihub.presentation.dto.request.workshop.UpdateWorkshopSessionRequest;
import com.unihub.presentation.dto.response.workshop.WorkshopDetailResponse;
import com.unihub.presentation.dto.response.workshop.WorkshopSessionResponse;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminWorkshopController {
  private final WorkshopCommandService workshopCommandService;
  private final WorkshopQueryService workshopQueryService;

  public AdminWorkshopController(
      WorkshopCommandService workshopCommandService,
      WorkshopQueryService workshopQueryService) {
    this.workshopCommandService = workshopCommandService;
    this.workshopQueryService = workshopQueryService;
  }

  @PostMapping("/workshops")
  public ApiResponse<WorkshopDetailResponse> createWorkshop(
      Authentication authentication,
      @Valid @RequestBody CreateWorkshopRequest request) {
    UUID userId = requireUserId(authentication);
    List<CreateSessionCommand> sessions = toSessionCommands(request.sessions(), null);

    Workshop workshop = workshopCommandService.createWorkshop(new CreateWorkshopCommand(
        request.title(),
        request.speaker(),
        request.description(),
        userId,
        sessions));

    WorkshopDetailResponse response = workshopQueryService.getAdminWorkshopDetail(workshop.id());
    return ApiResponse.success(response);
  }

  @PatchMapping("/workshops/{workshopId}")
  public ApiResponse<WorkshopDetailResponse> updateWorkshop(
      @PathVariable UUID workshopId,
      @RequestBody UpdateWorkshopRequest request) {
    workshopCommandService.updateWorkshop(new UpdateWorkshopCommand(
        workshopId,
        request.title(),
        request.speaker(),
        request.description()));

    WorkshopDetailResponse response = workshopQueryService.getAdminWorkshopDetail(workshopId);
    return ApiResponse.success(response);
  }

  @PostMapping("/workshops/{workshopId}/publish")
  public ApiResponse<WorkshopDetailResponse> publishWorkshop(@PathVariable UUID workshopId) {
    workshopCommandService.publishWorkshop(workshopId);
    WorkshopDetailResponse response = workshopQueryService.getAdminWorkshopDetail(workshopId);
    return ApiResponse.success(response);
  }

  @PostMapping("/workshops/{workshopId}/cancel")
  public ApiResponse<WorkshopDetailResponse> cancelWorkshop(@PathVariable UUID workshopId) {
    workshopCommandService.cancelWorkshop(workshopId);
    WorkshopDetailResponse response = workshopQueryService.getAdminWorkshopDetail(workshopId);
    return ApiResponse.success(response);
  }

  @PostMapping("/workshops/{workshopId}/sessions")
  public ApiResponse<WorkshopSessionResponse> createSession(
      @PathVariable UUID workshopId,
      @Valid @RequestBody CreateWorkshopSessionRequest request) {
    WorkshopSession session = workshopCommandService.createSession(new CreateSessionCommand(
        workshopId,
        request.roomId(),
        request.startAt(),
        request.endAt(),
        request.seatCapacity(),
        request.feeType(),
        request.feeAmount(),
        request.currency()));

    WorkshopSessionResponse response = workshopQueryService.getSessionResponse(session.id());
    return ApiResponse.success(response);
  }

  @PatchMapping("/sessions/{sessionId}")
  public ApiResponse<WorkshopSessionResponse> updateSession(
      @PathVariable UUID sessionId,
      @RequestBody UpdateWorkshopSessionRequest request) {
    workshopCommandService.updateSession(new UpdateSessionCommand(
        sessionId,
        request.roomId(),
        request.startAt(),
        request.endAt(),
        request.seatCapacity(),
        request.feeType(),
        request.feeAmount(),
        request.currency()));

    WorkshopSessionResponse response = workshopQueryService.getSessionResponse(sessionId);
    return ApiResponse.success(response);
  }

  @PostMapping("/sessions/{sessionId}/cancel")
  public ApiResponse<WorkshopSessionResponse> cancelSession(@PathVariable UUID sessionId) {
    workshopCommandService.cancelSession(sessionId);
    WorkshopSessionResponse response = workshopQueryService.getSessionResponse(sessionId);
    return ApiResponse.success(response);
  }

  private UUID requireUserId(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
      throw new AuthException(UserErrorCode.AUTH_TOKEN_MISSING, HttpStatus.UNAUTHORIZED);
    }
    return principal.id();
  }

  private List<CreateSessionCommand> toSessionCommands(List<CreateWorkshopSessionRequest> requests, UUID workshopId) {
    if (requests == null || requests.isEmpty()) {
      return List.of();
    }

    List<CreateSessionCommand> sessions = new ArrayList<>();
    for (CreateWorkshopSessionRequest request : requests) {
      sessions.add(new CreateSessionCommand(
          workshopId,
          request.roomId(),
          request.startAt(),
          request.endAt(),
          request.seatCapacity(),
          request.feeType(),
          request.feeAmount(),
          request.currency()));
    }

    return sessions;
  }
}
