package com.unihub.domain.csvimport;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CsvImportRepository {
  Optional<CsvImportBatch> findBatchById(UUID batchId);

  Optional<CsvImportBatch> findBatchByChecksum(String checksum);

  List<CsvImportBatch> findBatches(int page, int size);

  List<CsvImportError> findErrorsByBatchId(UUID batchId);

  CsvImportBatch createProcessingBatch(UUID batchId, String fileName, String checksum, LocalDateTime startedAt);

  CsvImportBatch createMissedBatch(UUID batchId, String fileName, String failureReason, LocalDateTime now);

  void finishBatch(
      UUID batchId,
      CsvImportStatus status,
      int totalRows,
      int successCount,
      int errorCount,
      int duplicateCount,
      String failureReason,
      LocalDateTime finishedAt);

  void saveErrors(UUID batchId, Collection<CsvImportRowError> errors, LocalDateTime createdAt);

  void upsertStudents(Collection<StudentRosterRow> rows, UUID batchId, LocalDateTime importedAt);
}
