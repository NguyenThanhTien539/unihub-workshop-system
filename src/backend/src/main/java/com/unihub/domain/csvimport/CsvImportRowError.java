package com.unihub.domain.csvimport;

public record CsvImportRowError(
    int rowNumber,
    String studentCode,
    String fieldName,
    CsvImportErrorCode errorCode,
    String errorMessage) {
}
