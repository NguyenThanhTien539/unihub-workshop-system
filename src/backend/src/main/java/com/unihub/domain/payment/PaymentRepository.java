package com.unihub.domain.payment;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository {
  PaymentIntent save(PaymentIntent paymentIntent);

  PaymentIntent update(PaymentIntent paymentIntent);

  Optional<PaymentIntent> findById(UUID paymentIntentId);

  Optional<PaymentIntent> findByIdForUpdate(UUID paymentIntentId);

  Optional<PaymentIntent> findByIdempotencyKey(String idempotencyKey);

  Optional<PaymentIntent> findByRegistrationId(UUID registrationId);

  Optional<PaymentIntent> findByProviderTransactionId(String providerTransactionId);

  Optional<PaymentIntent> findByProviderTransactionIdForUpdate(String providerTransactionId);

  List<UUID> findExpiredPendingIds(LocalDateTime now, int limit);
}
