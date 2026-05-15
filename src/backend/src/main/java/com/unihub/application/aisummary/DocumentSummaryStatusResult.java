package com.unihub.application.aisummary;

import com.unihub.domain.aisummary.AiSummaryStatus;
import com.unihub.domain.aisummary.UploadStatus;
import java.time.LocalDateTime;
import java.util.UUID;

public record DocumentSummaryStatusResult(
    UUID documentId,
    UUID workshopId,
    UploadStatus uploadStatus,
    AiSummaryStatus summaryStatus,
    LocalDateTime updatedAt) {
}
