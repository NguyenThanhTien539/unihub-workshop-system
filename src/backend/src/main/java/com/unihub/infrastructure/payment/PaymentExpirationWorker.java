package com.unihub.infrastructure.payment;

import com.unihub.application.payment.PaymentCommandService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class PaymentExpirationWorker {
  private static final Logger log = LoggerFactory.getLogger(PaymentExpirationWorker.class);

  private final PaymentCommandService paymentCommandService;

  public PaymentExpirationWorker(PaymentCommandService paymentCommandService) {
    this.paymentCommandService = paymentCommandService;
  }

  @Scheduled(fixedDelayString = "${app.payment.expiration-check-delay-ms:60000}")
  public void expirePendingPayments() {
    int expired = paymentCommandService.expirePendingPayments();
    if (expired > 0) {
      log.info("Expired {} pending payment intents", expired);
    }
  }
}
