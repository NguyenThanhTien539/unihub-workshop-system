package com.unihub.application.csvimport;

import com.unihub.domain.csvimport.CsvImportBatch;
import com.unihub.domain.csvimport.CsvImportErrorCode;
import com.unihub.domain.csvimport.CsvImportRepository;
import com.unihub.domain.csvimport.CsvImportRowError;
import com.unihub.domain.csvimport.CsvImportStatus;
import com.unihub.domain.csvimport.StudentRosterRow;
import com.unihub.infrastructure.config.CsvImportProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class CsvImportCommandService {
  private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

  private final CsvImportRepository csvImportRepository;
  private final CsvStudentRosterParser parser;
  private final TransactionTemplate transactionTemplate;
  private final Clock clock;
  private final int batchSize;

  @Autowired
  public CsvImportCommandService(
      CsvImportRepository csvImportRepository,
      CsvStudentRosterParser parser,
      TransactionTemplate transactionTemplate,
      Clock clock,
      CsvImportProperties properties) {
    this.csvImportRepository = csvImportRepository;
    this.parser = parser;
    this.transactionTemplate = transactionTemplate;
    this.clock = clock;
    this.batchSize = properties.effectiveBatchSize();
  }

  CsvImportCommandService(
      CsvImportRepository csvImportRepository,
      CsvStudentRosterParser parser,
      TransactionTemplate transactionTemplate,
      Clock clock) {
    this.csvImportRepository = csvImportRepository;
    this.parser = parser;
    this.transactionTemplate = transactionTemplate;
    this.clock = clock;
    this.batchSize = 500;
  }

  public CsvImportResult importFile(Path file) {
    String fileName = file.getFileName() == null ? file.toString() : file.getFileName().toString();
    byte[] bytes;
    try {
      if (!Files.isRegularFile(file) || !Files.isReadable(file)) {
        return failedBatch(fileName, null, CsvImportErrorCode.CSV_IMPORT_FILE_UNREADABLE.defaultMessage());
      }
      bytes = Files.readAllBytes(file);
    } catch (IOException ex) {
      return failedBatch(fileName, null, CsvImportErrorCode.CSV_IMPORT_FILE_UNREADABLE.defaultMessage());
    }

    String checksum = sha256(bytes);
    var existing = csvImportRepository.findBatchByChecksum(checksum);
    if (existing.isPresent() && existing.get().status() != CsvImportStatus.PROCESSING) {
      return new CsvImportResult(existing.get(), true, CsvImportErrorCode.CSV_IMPORT_ALREADY_PROCESSED.defaultMessage());
    }

    CsvImportBatch batch;
    try {
      batch = csvImportRepository.createProcessingBatch(UUID.randomUUID(), fileName, checksum, now());
    } catch (DataIntegrityViolationException ex) {
      return csvImportRepository.findBatchByChecksum(checksum)
          .map(found -> new CsvImportResult(found, true, CsvImportErrorCode.CSV_IMPORT_ALREADY_PROCESSED.defaultMessage()))
          .orElseThrow(() -> ex);
    }

    CsvStudentRosterParser.ParseResult parsed = parser.parse(bytes);
    if (parsed.hasFailure()) {
      csvImportRepository.finishBatch(
          batch.id(),
          CsvImportStatus.FAILED,
          0,
          0,
          0,
          0,
          parsed.failure().message(),
          now());
      return new CsvImportResult(
          requireBatch(batch.id()),
          false,
          parsed.failure().errorCode().defaultMessage());
    }

    PreparedRows preparedRows = prepareRows(parsed.rows());
    CsvImportStatus finalStatus = finalStatus(preparedRows);
    String failureReason = finalStatus == CsvImportStatus.FAILED ? "No valid student rows to import" : null;

    try {
      transactionTemplate.executeWithoutResult(status -> {
        if (!preparedRows.validRows().isEmpty()) {
          for (List<StudentRosterRow> chunk : chunks(preparedRows.validRows(), batchSize)) {
            csvImportRepository.upsertStudents(chunk, batch.id(), now());
          }
        }
        if (!preparedRows.errors().isEmpty()) {
          csvImportRepository.saveErrors(batch.id(), preparedRows.errors(), now());
        }
        csvImportRepository.finishBatch(
            batch.id(),
            finalStatus,
            parsed.rows().size(),
            preparedRows.validRows().size(),
            countErrorRows(preparedRows.errors()),
            preparedRows.duplicateCount(),
            failureReason,
            now());
      });
    } catch (RuntimeException ex) {
      csvImportRepository.finishBatch(
          batch.id(),
          CsvImportStatus.FAILED,
          parsed.rows().size(),
          0,
          0,
          0,
          "Database import failed",
          now());
      return new CsvImportResult(requireBatch(batch.id()), false, "Database import failed");
    }

    return new CsvImportResult(requireBatch(batch.id()), false, "CSV import completed");
  }

  public CsvImportResult recordMissed(String fileName, String reason) {
    CsvImportBatch batch = csvImportRepository.createMissedBatch(
        UUID.randomUUID(),
        fileName,
        reason == null || reason.isBlank() ? CsvImportErrorCode.CSV_IMPORT_MISSED.defaultMessage() : reason,
        now());
    return new CsvImportResult(batch, false, CsvImportErrorCode.CSV_IMPORT_MISSED.defaultMessage());
  }

  private CsvImportResult failedBatch(String fileName, String checksum, String reason) {
    CsvImportBatch batch = csvImportRepository.createProcessingBatch(UUID.randomUUID(), fileName, checksum, now());
    csvImportRepository.finishBatch(batch.id(), CsvImportStatus.FAILED, 0, 0, 0, 0, reason, now());
    return new CsvImportResult(requireBatch(batch.id()), false, reason);
  }

  private PreparedRows prepareRows(List<StudentRosterRow> parsedRows) {
    Map<String, StudentRosterRow> validRowsByStudentCode = new LinkedHashMap<>();
    Map<String, Integer> selectedRowNumberByStudentCode = new HashMap<>();
    List<CsvImportRowError> errors = new ArrayList<>();
    int duplicateCount = 0;

    for (StudentRosterRow row : parsedRows) {
      List<CsvImportRowError> rowErrors = validateRow(row);
      if (!rowErrors.isEmpty()) {
        errors.addAll(rowErrors);
        continue;
      }

      String studentCode = normalizeStudentCode(row.studentCode());
      if (validRowsByStudentCode.containsKey(studentCode)) {
        duplicateCount += 1;
        Integer previousRow = selectedRowNumberByStudentCode.get(studentCode);
        errors.add(new CsvImportRowError(
            row.rowNumber(),
            studentCode,
            "student_id",
            CsvImportErrorCode.CSV_IMPORT_DUPLICATE_ROWS,
            "Duplicate student_id; row " + row.rowNumber() + " overrides previous valid row " + previousRow));
      }

      StudentRosterRow normalized = new StudentRosterRow(
          row.rowNumber(),
          studentCode,
          row.fullName().trim(),
          normalizeNullable(row.email()),
          normalizeNullable(row.faculty()),
          normalizeNullable(row.major()),
          normalizeNullable(row.className()),
          row.status());
      validRowsByStudentCode.put(studentCode, normalized);
      selectedRowNumberByStudentCode.put(studentCode, row.rowNumber());
    }

    Collection<StudentRosterRow> validRows = validRowsByStudentCode.values().stream()
        .sorted(Comparator.comparing(StudentRosterRow::studentCode))
        .toList();
    return new PreparedRows(List.copyOf(validRows), List.copyOf(errors), duplicateCount);
  }

  private List<CsvImportRowError> validateRow(StudentRosterRow row) {
    List<CsvImportRowError> errors = new ArrayList<>();
    String studentCode = normalizeStudentCode(row.studentCode());
    if (studentCode == null) {
      errors.add(error(row, "student_id", CsvImportErrorCode.CSV_REQUIRED_FIELD_MISSING, "student_id is required"));
    } else if (studentCode.length() > 50) {
      errors.add(error(row, "student_id", CsvImportErrorCode.CSV_IMPORT_FIELD_TOO_LONG, "student_id must be 50 characters or fewer"));
    }

    if (row.fullName() == null || row.fullName().isBlank()) {
      errors.add(error(row, "full_name", CsvImportErrorCode.CSV_REQUIRED_FIELD_MISSING, "full_name is required"));
    } else if (row.fullName().trim().length() > 255) {
      errors.add(error(row, "full_name", CsvImportErrorCode.CSV_IMPORT_FIELD_TOO_LONG, "full_name must be 255 characters or fewer"));
    }

    if (row.email() != null && !row.email().isBlank()) {
      String email = row.email().trim();
      if (email.length() > 255) {
        errors.add(error(row, "email", CsvImportErrorCode.CSV_IMPORT_FIELD_TOO_LONG, "email must be 255 characters or fewer"));
      } else if (!EMAIL_PATTERN.matcher(email).matches()) {
        errors.add(error(row, "email", CsvImportErrorCode.CSV_INVALID_EMAIL, "Email format is invalid"));
      }
    }

    validateMaxLength(row, "faculty", row.faculty(), 255, errors);
    validateMaxLength(row, "major", row.major(), 255, errors);
    validateMaxLength(row, "class_name", row.className(), 100, errors);

    if (row.status() == null) {
      errors.add(error(row, "status", CsvImportErrorCode.CSV_INVALID_STATUS, "status must be ACTIVE, INACTIVE, GRADUATED, or SUSPENDED"));
    }

    return errors;
  }

  private void validateMaxLength(
      StudentRosterRow row,
      String fieldName,
      String value,
      int maxLength,
      List<CsvImportRowError> errors) {
    if (value != null && value.trim().length() > maxLength) {
      errors.add(error(row, fieldName, CsvImportErrorCode.CSV_IMPORT_FIELD_TOO_LONG,
          fieldName + " must be " + maxLength + " characters or fewer"));
    }
  }

  private CsvImportRowError error(
      StudentRosterRow row,
      String fieldName,
      CsvImportErrorCode errorCode,
      String message) {
    return new CsvImportRowError(row.rowNumber(), errorStudentCode(row.studentCode()), fieldName, errorCode, message);
  }

  private CsvImportStatus finalStatus(PreparedRows preparedRows) {
    if (preparedRows.errors().isEmpty()) {
      return CsvImportStatus.SUCCESS;
    }
    return CsvImportStatus.PARTIAL_SUCCESS;
  }

  private List<List<StudentRosterRow>> chunks(List<StudentRosterRow> rows, int size) {
    if (rows.size() <= size) {
      return List.of(rows);
    }
    List<List<StudentRosterRow>> chunks = new ArrayList<>();
    for (int start = 0; start < rows.size(); start += size) {
      chunks.add(rows.subList(start, Math.min(start + size, rows.size())));
    }
    return chunks;
  }

  private int countErrorRows(List<CsvImportRowError> errors) {
    Set<Integer> rows = new HashSet<>();
    for (CsvImportRowError error : errors) {
      rows.add(error.rowNumber());
    }
    return rows.size();
  }

  private CsvImportBatch requireBatch(UUID batchId) {
    return csvImportRepository.findBatchById(batchId)
        .orElseThrow(() -> new CsvImportException(CsvImportErrorCode.CSV_IMPORT_BATCH_NOT_FOUND,
            org.springframework.http.HttpStatus.NOT_FOUND));
  }

  private String normalizeStudentCode(String studentCode) {
    if (studentCode == null || studentCode.isBlank()) {
      return null;
    }
    return studentCode.trim().toUpperCase(Locale.ROOT);
  }

  private String errorStudentCode(String studentCode) {
    String normalized = normalizeStudentCode(studentCode);
    if (normalized == null || normalized.length() <= 50) {
      return normalized;
    }
    return normalized.substring(0, 50);
  }

  private String normalizeNullable(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }

  private String sha256(byte[] bytes) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hashed = digest.digest(bytes);
      StringBuilder builder = new StringBuilder(hashed.length * 2);
      for (byte current : hashed) {
        builder.append(String.format("%02x", current));
      }
      return builder.toString();
    } catch (Exception ex) {
      throw new IllegalStateException("SHA-256 algorithm unavailable", ex);
    }
  }

  private LocalDateTime now() {
    return LocalDateTime.now(clock);
  }

  private record PreparedRows(
      List<StudentRosterRow> validRows,
      List<CsvImportRowError> errors,
      int duplicateCount) {
  }
}
