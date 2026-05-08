package com.unihub.presentation.controller.registration;

import com.unihub.application.auth.exception.AuthException;
import com.unihub.application.registration.CreateFreeRegistrationCommand;
import com.unihub.application.registration.CreatePaidRegistrationCommand;
import com.unihub.application.registration.RegistrationCommandService;
import com.unihub.application.registration.RegistrationQueryService;
import com.unihub.application.registration.RegistrationResult;
import com.unihub.application.qr.QrTicketData;
import com.unihub.domain.registration.RegistrationView;
import com.unihub.domain.user.UserErrorCode;
import com.unihub.infrastructure.security.UserPrincipal;
import com.unihub.presentation.ApiResponse;
import com.unihub.presentation.dto.request.registration.RegistrationRequest;
import com.unihub.presentation.dto.response.qr.RegistrationQrResponse;
import com.unihub.presentation.dto.response.registration.RegistrationMutationResponse;
import com.unihub.presentation.dto.response.registration.RegistrationResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/registrations")
public class RegistrationController {
  private final RegistrationCommandService registrationCommandService;
  private final RegistrationQueryService registrationQueryService;

  public RegistrationController(
      RegistrationCommandService registrationCommandService,
      RegistrationQueryService registrationQueryService) {
    this.registrationCommandService = registrationCommandService;
    this.registrationQueryService = registrationQueryService;
  }

  @PostMapping("/free")
  public ApiResponse<RegistrationMutationResponse> registerFree(
      Authentication authentication,
      @Valid @RequestBody RegistrationRequest request) {
    RegistrationResult result = registrationCommandService.registerFree(
        new CreateFreeRegistrationCommand(requireUserId(authentication), request.sessionId()));
    return ApiResponse.success(toMutationResponse(result));
  }

  @PostMapping("/paid")
  public ApiResponse<RegistrationMutationResponse> registerPaid(
      Authentication authentication,
      @Valid @RequestBody RegistrationRequest request) {
    RegistrationResult result = registrationCommandService.registerPaid(
        new CreatePaidRegistrationCommand(requireUserId(authentication), request.sessionId()));
    return ApiResponse.success(toMutationResponse(result));
  }

  @GetMapping("/me")
  public ApiResponse<List<RegistrationResponse>> myRegistrations(Authentication authentication) {
    List<RegistrationResponse> responses = registrationQueryService.getMyRegistrations(requireUserId(authentication))
        .stream()
        .map(this::toResponse)
        .toList();
    return ApiResponse.success(responses);
  }

  @GetMapping("/{registrationId}")
  public ApiResponse<RegistrationResponse> registrationDetail(
      Authentication authentication,
      @PathVariable UUID registrationId) {
    RegistrationView view = registrationQueryService.getMyRegistration(requireUserId(authentication), registrationId);
    return ApiResponse.success(toResponse(view));
  }

  @GetMapping("/{registrationId}/qr")
  public ApiResponse<RegistrationQrResponse> registrationQr(
      Authentication authentication,
      @PathVariable UUID registrationId) {
    QrTicketData qrTicketData = registrationQueryService.getMyRegistrationQr(requireUserId(authentication), registrationId);
    return ApiResponse.success(new RegistrationQrResponse(
        registrationId,
        qrTicketData.qrTicketId(),
        qrTicketData.payload(),
        qrTicketData.dataUrl(),
        qrTicketData.expiresAt(),
        qrTicketData.status()));
  }

  private RegistrationMutationResponse toMutationResponse(RegistrationResult result) {
    return new RegistrationMutationResponse(
        result.registrationId(),
        result.workshopId(),
        result.sessionId(),
        result.registrationStatus(),
        result.qrAvailable(),
        result.paymentIntentId(),
        result.paymentStatus(),
        result.amount(),
        result.currency(),
        result.expiresAt());
  }

  private RegistrationResponse toResponse(RegistrationView view) {
    return new RegistrationResponse(
        view.registrationId(),
        view.workshopId(),
        view.workshopTitle(),
        view.sessionId(),
        view.roomName(),
        view.building(),
        view.startAt(),
        view.endAt(),
        view.registrationStatus().name(),
        view.registrationType().name(),
        view.paymentIntentId(),
        view.paymentStatus() == null ? null : view.paymentStatus().name(),
        view.amount(),
        view.currency(),
        view.paymentExpiresAt(),
        view.qrTicketId(),
        view.qrAvailable(),
        view.createdAt(),
        view.confirmedAt());
  }

  private UUID requireUserId(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
      throw new AuthException(UserErrorCode.AUTH_TOKEN_MISSING, HttpStatus.UNAUTHORIZED);
    }
    return principal.id();
  }
}
