package com.unihub.presentation.mapper.csvimport;

import com.unihub.domain.csvimport.CsvImportBatch;
import com.unihub.domain.csvimport.CsvImportError;
import com.unihub.presentation.dto.response.csvimport.CsvImportBatchResponse;
import com.unihub.presentation.dto.response.csvimport.CsvImportBatchSummaryResponse;
import com.unihub.presentation.dto.response.csvimport.CsvImportErrorResponse;
import org.springframework.stereotype.Component;

@Component
public class CsvImportResponseMapper {
  public CsvImportBatchSummaryResponse toBatchSummaryResponse(CsvImportBatch batch) {
    return new CsvImportBatchSummaryResponse(
        batch.id(),
        batch.fileName(),
        batch.checksum(),
        batch.status().name(),
        batch.startedAt(),
        batch.finishedAt(),
        batch.totalRows(),
        batch.successCount(),
        batch.errorCount());
  }

  public CsvImportBatchResponse toBatchResponse(CsvImportBatch batch) {
    return new CsvImportBatchResponse(
        batch.id(),
        batch.fileName(),
        batch.checksum(),
        batch.status().name(),
        batch.startedAt(),
        batch.finishedAt(),
        batch.totalRows(),
        batch.successCount(),
        batch.errorCount(),
        batch.failureReason());
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
