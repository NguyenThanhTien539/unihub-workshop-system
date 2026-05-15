package com.unihub.presentation.dto.response.csvimport;

import java.time.LocalDateTime;
import java.util.UUID;

public record CsvImportBatchSummaryResponse(
    UUID batchId,
    String fileName,
    String checksum,
    String status,
    LocalDateTime startedAt,
    LocalDateTime finishedAt,
    int totalRows,
    int successCount,
    int errorCount) {
}
