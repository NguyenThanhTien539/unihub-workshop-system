package com.unihub.presentation.mapper.csvimport;

import com.unihub.domain.csvimport.CsvImportBatch;
import com.unihub.domain.csvimport.CsvImportError;
import com.unihub.presentation.dto.response.csvimport.CsvImportBatchResponse;
import com.unihub.presentation.dto.response.csvimport.CsvImportErrorResponse;
import org.springframework.stereotype.Component;

@Component
public class CsvImportResponseMapper {
  public CsvImportBatchResponse toBatchResponse(CsvImportBatch batch) {
    return new CsvImportBatchResponse(
        batch.id(),
        batch.fileName(),
        batch.checksum(),
        batch.status().name(),
        batch.totalRows(),
        batch.successCount(),
        batch.errorCount(),
        batch.duplicateCount(),
        batch.failureReason(),
        batch.startedAt(),
        batch.finishedAt());
  }

  public CsvImportErrorResponse toErrorResponse(CsvImportError error) {
    return new CsvImportErrorResponse(
        error.rowNumber(),
        error.studentCode(),
        error.fieldName(),
        error.errorCode().code(),
        error.errorMessage());
  }
}
