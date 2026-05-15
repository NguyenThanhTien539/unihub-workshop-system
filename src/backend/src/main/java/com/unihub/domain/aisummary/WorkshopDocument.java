package com.unihub.domain.aisummary;

import java.time.LocalDateTime;
import java.util.UUID;

public record WorkshopDocument(
    UUID id,
    UUID workshopId,
    String objectKey,
    String originalFilename,
    String contentType,
    long fileSize,
    String checksum,
    UploadStatus uploadStatus,
    UUID uploadedByUserId,
    LocalDateTime uploadedAt,
    LocalDateTime createdAt,
    LocalDateTime updatedAt) {
}
