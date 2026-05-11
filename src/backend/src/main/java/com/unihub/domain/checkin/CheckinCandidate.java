package com.unihub.domain.checkin;

import com.unihub.domain.registration.RegistrationStatus;
import com.unihub.domain.workshop.WorkshopSessionStatus;
import com.unihub.domain.workshop.WorkshopStatus;
import java.time.LocalDateTime;
import java.util.UUID;

public record CheckinCandidate(
    UUID registrationId,
    RegistrationStatus registrationStatus,
    UUID sessionId,
    WorkshopStatus workshopStatus,
    WorkshopSessionStatus sessionStatus,
    LocalDateTime sessionStartAt,
    LocalDateTime sessionEndAt,
    String studentName,
    String studentCode) {
}
