package com.unihub.presentation.dto.response.csvimport;

import java.time.LocalDateTime;
import java.util.UUID;

public record CsvImportBatchResponse(
    UUID batchId,
    String fileName,
    String checksum,
    String status,
    int totalRows,
    int successCount,
    int errorCount,
    int duplicateCount,
    String failureReason,
    LocalDateTime startedAt,
    LocalDateTime finishedAt) {
}
