package com.unihub.application.aisummary;

import java.util.UUID;

public record UploadWorkshopDocumentCommand(
    UUID workshopId,
    UUID uploadedByUserId,
    String originalFilename,
    String contentType,
    long fileSize,
    byte[] bytes) {
}
