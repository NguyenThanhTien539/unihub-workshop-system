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
      ZaloPayCreateOrderResult result) {
    return new PaymentUrlResponse(
        result.paymentIntentId(),
        result.provider(),
        result.paymentUrl(),
        result.appTransId(),
        result.status(),
        result.expiresAt());
  }

  public PaymentStatusResponse toPaymentStatusResponse(PaymentStatusResult result) {
    return new PaymentStatusResponse(
        result.paymentIntentId(),
        result.registrationId(),
        result.status(),
        result.registrationStatus(),
        result.qrTicketId(),
        result.qrAvailable());
  }
}
