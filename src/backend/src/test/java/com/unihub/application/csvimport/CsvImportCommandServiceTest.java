package com.unihub.application.csvimport;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.unihub.domain.csvimport.CsvImportBatch;
import com.unihub.domain.csvimport.CsvImportError;
import com.unihub.domain.csvimport.CsvImportErrorCode;
import com.unihub.domain.csvimport.CsvImportRepository;
import com.unihub.domain.csvimport.CsvImportRowError;
import com.unihub.domain.csvimport.CsvImportStatus;
import com.unihub.domain.csvimport.StudentRosterRow;
import com.unihub.domain.student.StudentStatus;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

class CsvImportCommandServiceTest {
  private FakeCsvImportRepository repository;
  private CsvImportCommandService service;

  @BeforeEach
  void setUp() {
    repository = new FakeCsvImportRepository();
    service = new CsvImportCommandService(
        repository,
        new CsvStudentRosterParser(),
        new TransactionTemplate(new NoopTransactionManager()),
        Clock.fixed(Instant.parse("2026-05-13T10:00:00Z"), ZoneOffset.UTC));
  }

  @Test
  void importsValidRowsKeepsLatestDuplicateAndStoresRowErrors(@TempDir Path tempDir) throws Exception {
    Path file = tempDir.resolve("students.csv");
    Files.writeString(file, """
        student_id,full_name,email,faculty,major,class_name,status
        s001,Alice Nguyen,alice@example.edu,Engineering,Software,SE-01,ACTIVE
        S001,Alicia Nguyen,alicia@example.edu,Engineering,Software,SE-02,INACTIVE
        S002,Bob Tran,bob@example.edu,Business,Marketing,BA-02,
        S003,Invalid Email,not-an-email,Science,Data,DS-01,ACTIVE
        """, StandardCharsets.UTF_8);

    CsvImportResult result = service.importFile(file);

    assertFalse(result.skipped());
    assertEquals(CsvImportStatus.PARTIAL_SUCCESS, result.batch().status());
    assertEquals(4, result.batch().totalRows());
    assertEquals(2, result.batch().successCount());
    assertEquals(2, result.batch().errorCount());
    assertEquals(1, result.batch().duplicateCount());
    assertNull(result.batch().failureReason());

    StudentRosterRow s001 = repository.students.get("S001");
    assertEquals("Alicia Nguyen", s001.fullName());
    assertEquals("alicia@example.edu", s001.email());
    assertEquals("SE-02", s001.className());
    assertEquals(StudentStatus.INACTIVE, s001.status());

    StudentRosterRow s002 = repository.students.get("S002");
    assertEquals(StudentStatus.ACTIVE, s002.status());

    assertEquals(2, repository.errors.size());
    assertEquals(CsvImportErrorCode.CSV_IMPORT_DUPLICATE_ROWS, repository.errors.get(0).errorCode());
    assertEquals(3, repository.errors.get(0).rowNumber());
    assertEquals(CsvImportErrorCode.CSV_INVALID_EMAIL, repository.errors.get(1).errorCode());
    assertEquals(5, repository.errors.get(1).rowNumber());
  }

  @Test
  void skipsFileWhenChecksumWasAlreadyProcessed(@TempDir Path tempDir) throws Exception {
    Path file = tempDir.resolve("students.csv");
    Files.writeString(file, """
        student_id,full_name,email
        S001,Alice Nguyen,alice@example.edu
        """, StandardCharsets.UTF_8);

    CsvImportResult first = service.importFile(file);
    CsvImportResult second = service.importFile(file);

    assertFalse(first.skipped());
    assertTrue(second.skipped());
    assertEquals(first.batch().id(), second.batch().id());
    assertEquals(1, repository.batches.size());
    assertEquals(1, repository.students.size());
  }

  @Test
  void marksBatchFailedWhenRequiredHeaderIsMissing(@TempDir Path tempDir) throws Exception {
    Path file = tempDir.resolve("students.csv");
    Files.writeString(file, """
        student_id,email
        S001,alice@example.edu
        """, StandardCharsets.UTF_8);

    CsvImportResult result = service.importFile(file);

    assertEquals(CsvImportStatus.FAILED, result.batch().status());
    assertEquals(0, result.batch().totalRows());
    assertEquals(0, result.batch().successCount());
    assertEquals(0, repository.students.size());
    assertEquals("CSV file must contain full_name column", result.batch().failureReason());
  }

  @Test
  void truncatesOverlongStudentCodeInErrorReport(@TempDir Path tempDir) throws Exception {
    String longStudentId = "S".repeat(60);
    Path file = tempDir.resolve("students.csv");
    Files.writeString(file, """
        student_id,full_name,email
        %s,Alice Nguyen,alice@example.edu
        """.formatted(longStudentId), StandardCharsets.UTF_8);

    CsvImportResult result = service.importFile(file);

    assertEquals(CsvImportStatus.PARTIAL_SUCCESS, result.batch().status());
    assertEquals(0, repository.students.size());
    assertEquals(1, repository.errors.size());
    assertEquals(CsvImportErrorCode.CSV_IMPORT_FIELD_TOO_LONG, repository.errors.get(0).errorCode());
    assertEquals(50, repository.errors.get(0).studentCode().length());
  }

  @Test
  void structurallyValidFileWithOnlyInvalidRowsIsPartialAndKeepsExistingStudents(@TempDir Path tempDir)
      throws Exception {
    repository.students.put("S001", new StudentRosterRow(
        2,
        "S001",
        "Existing Student",
        "existing@example.edu",
        null,
        null,
        null,
        StudentStatus.ACTIVE));
    Path file = tempDir.resolve("students.csv");
    Files.writeString(file, """
        student_id,full_name,email,status
        ,Missing Id,missing@example.edu,ACTIVE
        S002,Invalid Status,invalid@example.edu,PAUSED
        S003,Invalid Email,not-an-email,ACTIVE
        """, StandardCharsets.UTF_8);

    CsvImportResult result = service.importFile(file);

    assertEquals(CsvImportStatus.PARTIAL_SUCCESS, result.batch().status());
    assertEquals(3, result.batch().totalRows());
    assertEquals(0, result.batch().successCount());
    assertEquals(3, result.batch().errorCount());
    assertEquals(1, repository.students.size());
    assertEquals("Existing Student", repository.students.get("S001").fullName());
    assertEquals(CsvImportErrorCode.CSV_REQUIRED_FIELD_MISSING, repository.errors.get(0).errorCode());
    assertEquals(CsvImportErrorCode.CSV_INVALID_STATUS, repository.errors.get(1).errorCode());
    assertEquals(CsvImportErrorCode.CSV_INVALID_EMAIL, repository.errors.get(2).errorCode());
  }

  @Test
  void missingRequiredColumnCreatesFailedBatchAndDoesNotUpdateStudents(@TempDir Path tempDir) throws Exception {
    repository.students.put("S001", new StudentRosterRow(
        2,
        "S001",
        "Existing Student",
        "existing@example.edu",
        null,
        null,
        null,
        StudentStatus.ACTIVE));
    Path file = tempDir.resolve("students.csv");
    Files.writeString(file, """
        full_name,email
        Alice Nguyen,alice@example.edu
        """, StandardCharsets.UTF_8);

    CsvImportResult result = service.importFile(file);

    assertEquals(CsvImportStatus.FAILED, result.batch().status());
    assertEquals(1, repository.students.size());
    assertEquals("Existing Student", repository.students.get("S001").fullName());
  }

  private static class FakeCsvImportRepository implements CsvImportRepository {
    private final Map<UUID, CsvImportBatch> batches = new LinkedHashMap<>();
    private final Map<String, StudentRosterRow> students = new LinkedHashMap<>();
    private final List<CsvImportError> errors = new ArrayList<>();

    @Override
    public Optional<CsvImportBatch> findBatchById(UUID batchId) {
      return Optional.ofNullable(batches.get(batchId));
    }

    @Override
    public Optional<CsvImportBatch> findBatchByChecksum(String checksum) {
      if (checksum == null || checksum.isBlank()) {
        return Optional.empty();
      }
      return batches.values().stream()
          .filter(batch -> checksum.equals(batch.checksum()))
          .findFirst();
    }

    @Override
    public List<CsvImportBatch> findBatches(int page, int size) {
      return batches.values().stream()
          .skip((long) page * size)
          .limit(size)
          .toList();
    }

    @Override
    public List<CsvImportError> findErrorsByBatchId(UUID batchId) {
      return errors.stream()
          .filter(error -> error.batchId().equals(batchId))
          .toList();
    }

    @Override
    public CsvImportBatch createProcessingBatch(
        UUID batchId,
        String fileName,
        String checksum,
        LocalDateTime startedAt) {
      CsvImportBatch batch = new CsvImportBatch(
          batchId,
          fileName,
          checksum,
          CsvImportStatus.PROCESSING,
          0,
          0,
          0,
          0,
          null,
          startedAt,
          null,
          startedAt);
      batches.put(batchId, batch);
      return batch;
    }

    @Override
    public CsvImportBatch createMissedBatch(
        UUID batchId,
        String fileName,
        String failureReason,
        LocalDateTime now) {
      CsvImportBatch batch = new CsvImportBatch(
          batchId,
          fileName,
          null,
          CsvImportStatus.MISSED,
          0,
          0,
          0,
          0,
          failureReason,
          now,
          now,
          now);
      batches.put(batchId, batch);
      return batch;
    }

    @Override
    public void finishBatch(
        UUID batchId,
        CsvImportStatus status,
        int totalRows,
        int successCount,
        int errorCount,
        int duplicateCount,
        String failureReason,
        LocalDateTime finishedAt) {
      CsvImportBatch existing = batches.get(batchId);
      batches.put(batchId, new CsvImportBatch(
          existing.id(),
          existing.fileName(),
          existing.checksum(),
          status,
          totalRows,
          successCount,
          errorCount,
          duplicateCount,
          failureReason,
          existing.startedAt(),
          finishedAt,
          existing.createdAt()));
    }

    @Override
    public void saveErrors(UUID batchId, Collection<CsvImportRowError> rowErrors, LocalDateTime createdAt) {
      for (CsvImportRowError rowError : rowErrors) {
        errors.add(new CsvImportError(
            UUID.randomUUID(),
            batchId,
            rowError.rowNumber(),
            rowError.studentCode(),
            rowError.fieldName(),
            rowError.errorCode(),
            rowError.errorMessage(),
            createdAt));
      }
    }

    @Override
    public void upsertStudents(Collection<StudentRosterRow> rows, UUID batchId, LocalDateTime importedAt) {
      for (StudentRosterRow row : rows) {
        students.put(row.studentCode(), row);
      }
    }
  }

  private static class NoopTransactionManager implements PlatformTransactionManager {
    @Override
    public TransactionStatus getTransaction(TransactionDefinition definition) {
      return new SimpleTransactionStatus();
    }

    @Override
    public void commit(TransactionStatus status) {
    }

    @Override
    public void rollback(TransactionStatus status) {
    }
  }
}
