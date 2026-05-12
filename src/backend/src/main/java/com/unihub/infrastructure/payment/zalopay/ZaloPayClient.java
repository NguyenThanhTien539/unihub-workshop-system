package com.unihub.infrastructure.payment.zalopay;

import com.unihub.domain.payment.PaymentIntent;
import com.unihub.domain.registration.RegistrationView;

public interface ZaloPayClient {
  PaymentIntent createOrder(PaymentIntent paymentIntent, RegistrationView registrationView, java.util.UUID userId);

  ZaloPayCallbackPayload verifyAndParseCallback(String data, String mac);
}
