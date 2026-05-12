package com.unihub.domain.registration;

import java.time.LocalDateTime;
import java.util.UUID;

public record Registration(
    UUID id,
    UUID studentId,
    UUID sessionId,
    RegistrationStatus status,
    RegistrationType registrationType,
    LocalDateTime reservedAt,
    LocalDateTime confirmedAt,
    LocalDateTime expiresAt,
    LocalDateTime canceledAt,
    LocalDateTime createdAt,
    LocalDateTime updatedAt) {
}
