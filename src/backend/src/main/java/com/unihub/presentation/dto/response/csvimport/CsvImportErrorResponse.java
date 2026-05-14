package com.unihub.presentation.dto.response.csvimport;

public record CsvImportErrorResponse(
    int rowNumber,
    String studentId,
    String fieldName,
    String errorCode,
    String errorMessage) {
}
