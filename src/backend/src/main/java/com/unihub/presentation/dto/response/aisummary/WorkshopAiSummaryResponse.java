package com.unihub.presentation.dto.response.aisummary;

import java.time.LocalDateTime;
import java.util.UUID;

public record WorkshopAiSummaryResponse(
    UUID workshopId,
    UUID documentId,
    String summaryStatus,
    String summaryText,
    LocalDateTime generatedAt,
    String errorCode) {
}
