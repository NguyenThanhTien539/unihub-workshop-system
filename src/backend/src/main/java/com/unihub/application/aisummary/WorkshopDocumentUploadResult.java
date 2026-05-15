package com.unihub.application.aisummary;

import com.unihub.domain.aisummary.AiSummaryStatus;
import com.unihub.domain.aisummary.UploadStatus;
import java.util.UUID;

public record WorkshopDocumentUploadResult(
    UUID documentId,
    UUID workshopId,
    UploadStatus uploadStatus,
    AiSummaryStatus summaryStatus) {
}
