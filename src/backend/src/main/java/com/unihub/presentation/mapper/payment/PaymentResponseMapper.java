package com.unihub.presentation.mapper.payment;

import com.unihub.application.payment.PaymentStatusResult;
import com.unihub.application.payment.ZaloPayCreateOrderResult;
import com.unihub.presentation.dto.response.payment.PaymentStatusResponse;
import com.unihub.presentation.dto.response.payment.PaymentUrlResponse;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class PaymentResponseMapper {
  public PaymentUrlResponse toPaymentUrlResponse(
      UUID paymentIntentId,
      ZaloPayCreateOrderResult result,
      PaymentStatusResult paymentStatus) {
    return new PaymentUrlResponse(
        paymentIntentId,
        result.paymentUrl(),
        result.provider(),
        paymentStatus.amount(),
        paymentStatus.currency(),
        paymentStatus.expiresAt());
  }

  public PaymentStatusResponse toPaymentStatusResponse(PaymentStatusResult result) {
    return new PaymentStatusResponse(
        result.paymentIntentId(),
        result.registrationId(),
        result.paymentStatus(),
        result.registrationStatus(),
        result.amount(),
        result.currency(),
        result.provider(),
        result.providerTransactionId(),
        result.expiresAt(),
        result.qrAvailable());
  }
}
