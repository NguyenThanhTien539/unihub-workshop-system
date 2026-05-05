package com.unihub.presentation.dto.response.workshop;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record WorkshopDetailResponse(
    UUID id,
    String title,
    String speaker,
    String description,
    String status,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    LocalDateTime publishedAt,
    LocalDateTime canceledAt,
    List<WorkshopSessionResponse> sessions) {
}
