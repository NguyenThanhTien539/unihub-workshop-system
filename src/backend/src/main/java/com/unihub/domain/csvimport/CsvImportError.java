package com.unihub.domain.csvimport;

import java.time.LocalDateTime;
import java.util.UUID;

public record CsvImportError(
    UUID id,
    UUID batchId,
    int rowNumber,
    String studentCode,
    String fieldName,
    CsvImportErrorCode errorCode,
    String errorMessage,
    LocalDateTime createdAt) {
}
