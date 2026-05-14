package com.unihub.application.csvimport;

import com.unihub.domain.csvimport.CsvImportBatch;
import com.unihub.domain.csvimport.CsvImportError;
import com.unihub.domain.csvimport.CsvImportErrorCode;
import com.unihub.domain.csvimport.CsvImportRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CsvImportQueryService {
  private final CsvImportRepository csvImportRepository;

  public CsvImportQueryService(CsvImportRepository csvImportRepository) {
    this.csvImportRepository = csvImportRepository;
  }

  @Transactional(readOnly = true)
  public List<CsvImportBatch> listBatches(Integer page, Integer size) {
    return csvImportRepository.findBatches(sanitizePage(page), sanitizeSize(size));
  }

  @Transactional(readOnly = true)
  public CsvImportBatch getBatch(UUID batchId) {
    return csvImportRepository.findBatchById(batchId)
        .orElseThrow(() -> new CsvImportException(CsvImportErrorCode.CSV_IMPORT_BATCH_NOT_FOUND, HttpStatus.NOT_FOUND));
  }

  @Transactional(readOnly = true)
  public List<CsvImportError> getBatchErrors(UUID batchId) {
    getBatch(batchId);
    return csvImportRepository.findErrorsByBatchId(batchId);
  }

  private int sanitizePage(Integer page) {
    return page == null || page < 0 ? 0 : page;
  }

  private int sanitizeSize(Integer size) {
    if (size == null) {
      return 50;
    }
    if (size < 1) {
      return 1;
    }
    return Math.min(size, 100);
  }
}
