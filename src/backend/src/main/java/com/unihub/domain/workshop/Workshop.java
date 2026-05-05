package com.unihub.domain.workshop;

import java.time.LocalDateTime;
import java.util.UUID;

public record Workshop(
    UUID id,
    String title,
    String speaker,
    String description,
    WorkshopStatus status,
    UUID createdByUserId,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    LocalDateTime publishedAt,
    LocalDateTime canceledAt) {
}
