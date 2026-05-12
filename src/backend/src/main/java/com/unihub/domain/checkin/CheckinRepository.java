package com.unihub.domain.checkin;

import java.util.Optional;
import java.util.UUID;

public interface CheckinRepository {
  Optional<CheckinCandidate> findCandidateByRegistrationId(UUID registrationId);

  Optional<CheckinRecord> findByRegistrationId(UUID registrationId);

  Optional<CheckinRecord> findBySyncEventId(String syncEventId);

  CheckinRecord save(CheckinRecord checkinRecord);
}
