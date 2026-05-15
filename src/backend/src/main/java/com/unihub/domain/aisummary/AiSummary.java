package com.unihub.domain.aisummary;

import java.time.LocalDateTime;
import java.util.UUID;

public record AiSummary(
    UUID id,
    UUID documentId,
    UUID workshopId,
    AiSummaryStatus status,
    String summaryText,
    String modelName,
    int attemptCount,
    String errorCode,
    String errorMessage,
    LocalDateTime startedAt,
    LocalDateTime completedAt,
    LocalDateTime generatedAt,
    LocalDateTime createdAt,
    LocalDateTime updatedAt) {
}
