package com.unihub.domain.aisummary;

import java.time.LocalDateTime;
import java.util.UUID;

public record DocumentSummaryView(
    UUID documentId,
    UUID workshopId,
    UploadStatus uploadStatus,
    AiSummaryStatus summaryStatus,
    String summaryText,
    String errorCode,
    String errorMessage,
    LocalDateTime generatedAt,
    LocalDateTime updatedAt) {
}
