package com.unihub.presentation.controller.payment;

import com.unihub.application.auth.exception.AuthException;
import com.unihub.application.payment.CreatePaymentUrlCommand;
import com.unihub.application.payment.PaymentCommandService;
import com.unihub.application.payment.PaymentQueryService;
import com.unihub.application.payment.PaymentStatusResult;
import com.unihub.application.payment.exception.PaymentException;
import com.unihub.application.payment.ZaloPayCallbackResult;
import com.unihub.application.payment.ZaloPayCreateOrderResult;
import com.unihub.domain.user.UserErrorCode;
import com.unihub.infrastructure.security.UserPrincipal;
import com.unihub.presentation.ApiResponse;
import com.unihub.presentation.dto.request.payment.ZaloPayCallbackRequest;
import com.unihub.presentation.dto.response.payment.PaymentStatusResponse;
import com.unihub.presentation.dto.response.payment.PaymentUrlResponse;
import jakarta.validation.Valid;
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
@RequestMapping("/api/payments")
public class PaymentController {
  private final PaymentCommandService paymentCommandService;
  private final PaymentQueryService paymentQueryService;

  public PaymentController(
      PaymentCommandService paymentCommandService,
      PaymentQueryService paymentQueryService) {
    this.paymentCommandService = paymentCommandService;
    this.paymentQueryService = paymentQueryService;
  }

  @PostMapping("/intents/{paymentIntentId}/zalopay")
  public ApiResponse<PaymentUrlResponse> createZaloPayUrl(
      Authentication authentication,
      @PathVariable UUID paymentIntentId) {
    ZaloPayCreateOrderResult result = paymentCommandService.createZaloPayPaymentUrl(
        new CreatePaymentUrlCommand(requireUserId(authentication), paymentIntentId));
    PaymentStatusResult paymentStatus = paymentQueryService.getPaymentStatus(requireUserId(authentication), paymentIntentId);
    return ApiResponse.success(new PaymentUrlResponse(
        paymentIntentId,
        result.paymentUrl(),
        result.provider(),
        paymentStatus.amount(),
        paymentStatus.currency(),
        paymentStatus.expiresAt()));
  }

  @PostMapping("/zalopay/callback")
  public ZaloPayCallbackResult zaloPayCallback(@Valid @RequestBody ZaloPayCallbackRequest request) {
    try {
      return paymentCommandService.handleZaloPayCallback(request.data(), request.mac());
    } catch (PaymentException ex) {
      int code = ex.getStatus() == HttpStatus.UNAUTHORIZED ? -1 : 0;
      return new ZaloPayCallbackResult(code, ex.getMessage());
    } catch (Exception ex) {
      return new ZaloPayCallbackResult(0, "internal error");
    }
  }

  @GetMapping("/{paymentIntentId}/status")
  public ApiResponse<PaymentStatusResponse> paymentStatus(
      Authentication authentication,
      @PathVariable UUID paymentIntentId) {
    PaymentStatusResult result = paymentQueryService.getPaymentStatus(requireUserId(authentication), paymentIntentId);
    return ApiResponse.success(new PaymentStatusResponse(
        result.paymentIntentId(),
        result.registrationId(),
        result.paymentStatus(),
        result.registrationStatus(),
        result.amount(),
        result.currency(),
        result.provider(),
        result.providerTransactionId(),
        result.expiresAt(),
        result.qrAvailable()));
  }

  private UUID requireUserId(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
      throw new AuthException(UserErrorCode.AUTH_TOKEN_MISSING, HttpStatus.UNAUTHORIZED);
    }
    return principal.id();
  }
}
