package com.unihub.application.aisummary;

import com.unihub.domain.aisummary.AiSummaryStatus;
import java.time.LocalDateTime;
import java.util.UUID;

public record WorkshopSummaryResult(
    UUID workshopId,
    UUID documentId,
    AiSummaryStatus summaryStatus,
    String summaryText,
    LocalDateTime generatedAt,
    String errorCode) {
}
