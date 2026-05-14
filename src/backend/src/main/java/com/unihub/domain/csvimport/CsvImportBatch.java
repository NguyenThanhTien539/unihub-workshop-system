package com.unihub.domain.csvimport;

import java.time.LocalDateTime;
import java.util.UUID;

public record CsvImportBatch(
    UUID id,
    String fileName,
    String checksum,
    CsvImportStatus status,
    int totalRows,
    int successCount,
    int errorCount,
    int duplicateCount,
    String failureReason,
    LocalDateTime startedAt,
    LocalDateTime finishedAt,
    LocalDateTime createdAt) {
}
