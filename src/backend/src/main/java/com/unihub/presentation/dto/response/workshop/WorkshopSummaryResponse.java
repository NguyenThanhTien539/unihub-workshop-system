package com.unihub.presentation.dto.response.workshop;

import java.util.List;
import java.util.UUID;

public record WorkshopSummaryResponse(
    UUID id,
    String title,
    String speaker,
    String description,
    String status,
    List<WorkshopSessionResponse> sessions) {
}
