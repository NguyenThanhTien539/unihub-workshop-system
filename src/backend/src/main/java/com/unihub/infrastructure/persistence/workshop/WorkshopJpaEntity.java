package com.unihub.infrastructure.persistence.workshop;

import com.unihub.domain.workshop.Workshop;
import com.unihub.domain.workshop.WorkshopStatus;
import java.time.LocalDateTime;
import java.util.UUID;

public record WorkshopJpaEntity(
    UUID id,
    String title,
    String speaker,
    String description,
    String status,
    UUID createdByUserId,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    LocalDateTime publishedAt,
    LocalDateTime canceledAt) {
  Workshop toDomain() {
    return new Workshop(
        id,
        title,
        speaker,
        description,
        WorkshopStatus.valueOf(status),
        createdByUserId,
        createdAt,
        updatedAt,
        publishedAt,
        canceledAt);
  }
}
