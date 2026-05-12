package com.unihub.domain.payment;

import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository {
  PaymentIntent save(PaymentIntent paymentIntent);

  PaymentIntent update(PaymentIntent paymentIntent);

  Optional<PaymentIntent> findById(UUID paymentIntentId);

  Optional<PaymentIntent> findByIdForUpdate(UUID paymentIntentId);

  Optional<PaymentIntent> findByRegistrationId(UUID registrationId);

  Optional<PaymentIntent> findByGatewayRef(String gatewayRef);

  Optional<PaymentIntent> findByGatewayRefForUpdate(String gatewayRef);
}
