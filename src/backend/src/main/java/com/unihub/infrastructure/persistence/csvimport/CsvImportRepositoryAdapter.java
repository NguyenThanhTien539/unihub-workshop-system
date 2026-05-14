package com.unihub.infrastructure.persistence.csvimport;

import com.unihub.domain.csvimport.CsvImportBatch;
import com.unihub.domain.csvimport.CsvImportError;
import com.unihub.domain.csvimport.CsvImportErrorCode;
import com.unihub.domain.csvimport.CsvImportRepository;
import com.unihub.domain.csvimport.CsvImportRowError;
import com.unihub.domain.csvimport.CsvImportStatus;
import com.unihub.domain.csvimport.StudentRosterRow;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CsvImportRepositoryAdapter implements CsvImportRepository {
  private static final String BASE_BATCH_SELECT = """
      SELECT id, file_name, checksum, status, total_rows, success_count, error_count,
             duplicate_count, failure_reason, started_at, finished_at, created_at
      FROM csv_import_batches
      """;

  private static final String SQL_INSERT_PROCESSING_BATCH = """
      INSERT INTO csv_import_batches (
        id, file_name, checksum, status, started_at, created_at
      ) VALUES (
        :id, :fileName, :checksum, 'PROCESSING', :startedAt, :createdAt
      )
      """;

  private static final String SQL_INSERT_MISSED_BATCH = """
      INSERT INTO csv_import_batches (
        id, file_name, checksum, status, total_rows, success_count, error_count,
        duplicate_count, failure_reason, started_at, finished_at, created_at
      ) VALUES (
        :id, :fileName, NULL, 'MISSED', 0, 0, 0, 0, :failureReason,
        :startedAt, :finishedAt, :createdAt
      )
      """;

  private static final String SQL_FINISH_BATCH = """
      UPDATE csv_import_batches
      SET status = :status,
          total_rows = :totalRows,
          success_count = :successCount,
          error_count = :errorCount,
          duplicate_count = :duplicateCount,
          failure_reason = :failureReason,
          finished_at = :finishedAt
      WHERE id = :id
      """;

  private static final String SQL_INSERT_ERROR = """
      INSERT INTO csv_import_errors (
        id, batch_id, row_number, student_code, field_name, error_code, error_message, created_at
      ) VALUES (
        :id, :batchId, :rowNumber, :studentCode, :fieldName, :errorCode, :errorMessage, :createdAt
      )
      """;

  private static final String SQL_UPSERT_STUDENT = """
      INSERT INTO students (
        id, user_id, student_code, full_name, email, faculty, major, class_name,
        status, import_batch_id, imported_at, created_at, updated_at
      ) VALUES (
        :id, NULL, :studentCode, :fullName, :email, :faculty, :major, :className,
        :status, :batchId, :importedAt, :createdAt, :updatedAt
      )
      ON CONFLICT (student_code) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          faculty = EXCLUDED.faculty,
          major = EXCLUDED.major,
          class_name = EXCLUDED.class_name,
          status = EXCLUDED.status,
          import_batch_id = EXCLUDED.import_batch_id,
          imported_at = EXCLUDED.imported_at,
          updated_at = EXCLUDED.updated_at
      """;

  private static final String BASE_ERROR_SELECT = """
      SELECT id, batch_id, row_number, student_code, field_name, error_code, error_message, created_at
      FROM csv_import_errors
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;

  public CsvImportRepositoryAdapter(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public Optional<CsvImportBatch> findBatchById(UUID batchId) {
    List<CsvImportBatch> rows = jdbcTemplate.query(
        BASE_BATCH_SELECT + " WHERE id = :id LIMIT 1",
        new MapSqlParameterSource("id", batchId),
        batchRowMapper());
    return rows.stream().findFirst();
  }

  @Override
  public Optional<CsvImportBatch> findBatchByChecksum(String checksum) {
    if (checksum == null || checksum.isBlank()) {
      return Optional.empty();
    }
    List<CsvImportBatch> rows = jdbcTemplate.query(
        BASE_BATCH_SELECT + " WHERE checksum = :checksum LIMIT 1",
        new MapSqlParameterSource("checksum", checksum),
        batchRowMapper());
    return rows.stream().findFirst();
  }

  @Override
  public List<CsvImportBatch> findBatches(int page, int size) {
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("limit", size)
        .addValue("offset", page * size);
    return jdbcTemplate.query(
        BASE_BATCH_SELECT + " ORDER BY started_at DESC LIMIT :limit OFFSET :offset",
        params,
        batchRowMapper());
  }

  @Override
  public List<CsvImportError> findErrorsByBatchId(UUID batchId) {
    return jdbcTemplate.query(
        BASE_ERROR_SELECT + " WHERE batch_id = :batchId ORDER BY row_number ASC, id ASC",
        new MapSqlParameterSource("batchId", batchId),
        errorRowMapper());
  }

  @Override
  public CsvImportBatch createProcessingBatch(UUID batchId, String fileName, String checksum, LocalDateTime startedAt) {
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("id", batchId)
        .addValue("fileName", fileName)
        .addValue("checksum", checksum)
        .addValue("startedAt", toTimestamp(startedAt))
        .addValue("createdAt", toTimestamp(startedAt));
    jdbcTemplate.update(SQL_INSERT_PROCESSING_BATCH, params);
    return findBatchById(batchId).orElseThrow();
  }

  @Override
  public CsvImportBatch createMissedBatch(UUID batchId, String fileName, String failureReason, LocalDateTime now) {
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("id", batchId)
        .addValue("fileName", fileName)
        .addValue("failureReason", failureReason)
        .addValue("startedAt", toTimestamp(now))
        .addValue("finishedAt", toTimestamp(now))
        .addValue("createdAt", toTimestamp(now));
    jdbcTemplate.update(SQL_INSERT_MISSED_BATCH, params);
    return findBatchById(batchId).orElseThrow();
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
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("id", batchId)
        .addValue("status", status.name())
        .addValue("totalRows", totalRows)
        .addValue("successCount", successCount)
        .addValue("errorCount", errorCount)
        .addValue("duplicateCount", duplicateCount)
        .addValue("failureReason", failureReason)
        .addValue("finishedAt", toTimestamp(finishedAt));
    jdbcTemplate.update(SQL_FINISH_BATCH, params);
  }

  @Override
  public void saveErrors(UUID batchId, Collection<CsvImportRowError> errors, LocalDateTime createdAt) {
    if (errors == null || errors.isEmpty()) {
      return;
    }
    MapSqlParameterSource[] params = errors.stream()
        .map(error -> new MapSqlParameterSource()
            .addValue("id", UUID.randomUUID())
            .addValue("batchId", batchId)
            .addValue("rowNumber", error.rowNumber())
            .addValue("studentCode", error.studentCode())
            .addValue("fieldName", error.fieldName())
            .addValue("errorCode", error.errorCode().code())
            .addValue("errorMessage", error.errorMessage())
            .addValue("createdAt", toTimestamp(createdAt)))
        .toArray(MapSqlParameterSource[]::new);
    jdbcTemplate.batchUpdate(SQL_INSERT_ERROR, params);
  }

  @Override
  public void upsertStudents(Collection<StudentRosterRow> rows, UUID batchId, LocalDateTime importedAt) {
    if (rows == null || rows.isEmpty()) {
      return;
    }
    MapSqlParameterSource[] params = rows.stream()
        .map(row -> new MapSqlParameterSource()
            .addValue("id", UUID.randomUUID())
            .addValue("studentCode", row.studentCode())
            .addValue("fullName", row.fullName())
            .addValue("email", row.email())
            .addValue("faculty", row.faculty())
            .addValue("major", row.major())
            .addValue("className", row.className())
            .addValue("status", row.status().name())
            .addValue("batchId", batchId)
            .addValue("importedAt", toTimestamp(importedAt))
            .addValue("createdAt", toTimestamp(importedAt))
            .addValue("updatedAt", toTimestamp(importedAt)))
        .toArray(MapSqlParameterSource[]::new);
    jdbcTemplate.batchUpdate(SQL_UPSERT_STUDENT, params);
  }

  private RowMapper<CsvImportBatch> batchRowMapper() {
    return (rs, rowNum) -> new CsvImportBatch(
        rs.getObject("id", UUID.class),
        rs.getString("file_name"),
        rs.getString("checksum"),
        CsvImportStatus.valueOf(rs.getString("status")),
        rs.getInt("total_rows"),
        rs.getInt("success_count"),
        rs.getInt("error_count"),
        rs.getInt("duplicate_count"),
        rs.getString("failure_reason"),
        toLocalDateTime(rs.getTimestamp("started_at")),
        toLocalDateTime(rs.getTimestamp("finished_at")),
        toLocalDateTime(rs.getTimestamp("created_at")));
  }

  private RowMapper<CsvImportError> errorRowMapper() {
    return (rs, rowNum) -> new CsvImportError(
        rs.getObject("id", UUID.class),
        rs.getObject("batch_id", UUID.class),
        rs.getInt("row_number"),
        rs.getString("student_code"),
        rs.getString("field_name"),
        errorCode(rs.getString("error_code")),
        rs.getString("error_message"),
        toLocalDateTime(rs.getTimestamp("created_at")));
  }

  private CsvImportErrorCode errorCode(String code) {
    for (CsvImportErrorCode current : CsvImportErrorCode.values()) {
      if (current.code().equals(code)) {
        return current;
      }
    }
    return CsvImportErrorCode.CSV_IMPORT_FAILED;
  }

  private Timestamp toTimestamp(LocalDateTime value) {
    return value == null ? null : Timestamp.valueOf(value);
  }

  private LocalDateTime toLocalDateTime(Timestamp value) {
    return value == null ? null : value.toLocalDateTime();
  }
}
