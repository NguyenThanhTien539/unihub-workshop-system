package com.unihub.domain.qr;

import java.util.Optional;
import java.util.UUID;

public interface QrTicketRepository {
  Optional<QrTicket> findByRegistrationId(UUID registrationId);

  Optional<QrTicket> findByTokenHash(String qrTokenHash);

  QrTicket save(QrTicket qrTicket);
}
