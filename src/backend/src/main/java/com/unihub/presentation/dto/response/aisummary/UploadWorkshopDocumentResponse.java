package com.unihub.presentation.dto.response.aisummary;

import java.util.UUID;

public record UploadWorkshopDocumentResponse(
    UUID documentId,
    UUID workshopId,
    String uploadStatus,
    String summaryStatus) {
}
