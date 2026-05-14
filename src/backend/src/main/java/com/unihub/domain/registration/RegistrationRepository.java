package com.unihub.domain.registration;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RegistrationRepository {
  Optional<Registration> findById(UUID registrationId);

  Optional<Registration> findByIdForUpdate(UUID registrationId);

  Optional<Registration> findActiveByStudentAndSession(UUID studentId, UUID sessionId);

  RegistrationSessionSnapshot lockSessionForRegistration(UUID sessionId);

  Registration save(Registration registration);

  Registration update(Registration registration);

  void updateSessionSeatCounters(UUID sessionId, int seatsConfirmedDelta, int seatsReservedDelta);

  List<RegistrationView> findViewsByStudentId(UUID studentId);

  Optional<RegistrationView> findViewByIdForStudent(UUID registrationId, UUID studentId);

  Optional<RegistrationEmailView> findEmailViewByRegistrationId(UUID registrationId);
}
