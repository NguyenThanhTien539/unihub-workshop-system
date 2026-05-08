package com.unihub.domain.qr;

import java.util.Optional;
import java.util.UUID;

public interface QrTicketRepository {
  Optional<QrTicket> findByRegistrationId(UUID registrationId);

  QrTicket save(QrTicket qrTicket);
}
