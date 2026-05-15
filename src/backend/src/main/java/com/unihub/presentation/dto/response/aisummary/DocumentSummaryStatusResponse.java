package com.unihub.presentation.dto.response.aisummary;

import java.time.LocalDateTime;
import java.util.UUID;

public record DocumentSummaryStatusResponse(
    UUID documentId,
    UUID workshopId,
    String uploadStatus,
    String summaryStatus,
    LocalDateTime updatedAt) {
}
