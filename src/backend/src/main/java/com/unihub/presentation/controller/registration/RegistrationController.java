package com.unihub.presentation.controller.registration;

import com.unihub.application.auth.exception.AuthException;
import com.unihub.application.registration.CreateFreeRegistrationCommand;
import com.unihub.application.registration.CreatePaidRegistrationCommand;
import com.unihub.application.registration.RegistrationCommandService;
import com.unihub.application.registration.RegistrationQueryService;
import com.unihub.domain.user.UserErrorCode;
import com.unihub.infrastructure.security.UserPrincipal;
import com.unihub.presentation.ApiResponse;
import com.unihub.presentation.dto.request.registration.RegistrationRequest;
import com.unihub.presentation.dto.response.qr.RegistrationQrResponse;
import com.unihub.presentation.dto.response.registration.RegistrationMutationResponse;
import com.unihub.presentation.dto.response.registration.RegistrationResponse;
import com.unihub.presentation.mapper.registration.RegistrationResponseMapper;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
  private final RegistrationResponseMapper registrationResponseMapper;

  public RegistrationController(
      RegistrationCommandService registrationCommandService,
      RegistrationQueryService registrationQueryService,
      RegistrationResponseMapper registrationResponseMapper) {
    this.registrationCommandService = registrationCommandService;
    this.registrationQueryService = registrationQueryService;
    this.registrationResponseMapper = registrationResponseMapper;
  }

  @PostMapping("/free")
  public ResponseEntity<ApiResponse<RegistrationMutationResponse>> registerFree(
      Authentication authentication,
      @Valid @RequestBody RegistrationRequest request) {
    var result = registrationCommandService.registerFree(
        new CreateFreeRegistrationCommand(requireUserId(authentication), request.sessionId()));
    return ResponseEntity.ok(ApiResponse.success(registrationResponseMapper.toMutationResponse(result)));
  }

  @PostMapping("/paid")
  public ResponseEntity<ApiResponse<RegistrationMutationResponse>> registerPaid(
      Authentication authentication,
      @Valid @RequestBody RegistrationRequest request) {
    var result = registrationCommandService.registerPaid(
        new CreatePaidRegistrationCommand(requireUserId(authentication), request.sessionId(), request.idempotencyKey()));
    return ResponseEntity.ok(ApiResponse.success(registrationResponseMapper.toMutationResponse(result)));
  }

  @GetMapping("/me")
  public ResponseEntity<ApiResponse<List<RegistrationResponse>>> myRegistrations(Authentication authentication) {
    List<RegistrationResponse> responses = registrationQueryService.getMyRegistrations(requireUserId(authentication))
        .stream()
        .map(registrationResponseMapper::toResponse)
        .toList();
    return ResponseEntity.ok(ApiResponse.success(responses));
  }

  @GetMapping("/{registrationId}")
  public ResponseEntity<ApiResponse<RegistrationResponse>> registrationDetail(
      Authentication authentication,
      @PathVariable UUID registrationId) {
    var view = registrationQueryService.getMyRegistration(requireUserId(authentication), registrationId);
    return ResponseEntity.ok(ApiResponse.success(registrationResponseMapper.toResponse(view)));
  }

  @GetMapping("/{registrationId}/qr")
  public ResponseEntity<ApiResponse<RegistrationQrResponse>> registrationQr(
      Authentication authentication,
      @PathVariable UUID registrationId) {
    var qrTicketData = registrationQueryService.getMyRegistrationQr(requireUserId(authentication), registrationId);
    return ResponseEntity.ok(ApiResponse.success(
        registrationResponseMapper.toQrResponse(registrationId, qrTicketData)));
  }

  private UUID requireUserId(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
      throw new AuthException(UserErrorCode.AUTH_TOKEN_MISSING, HttpStatus.UNAUTHORIZED);
    }
    return principal.id();
  }
}
