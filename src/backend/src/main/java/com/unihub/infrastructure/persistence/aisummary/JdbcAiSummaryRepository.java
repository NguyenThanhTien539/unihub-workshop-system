package com.unihub.infrastructure.persistence.aisummary;

import com.unihub.domain.aisummary.AiSummary;
import com.unihub.domain.aisummary.AiSummaryRepository;
import com.unihub.domain.aisummary.AiSummaryStatus;
import com.unihub.domain.aisummary.DocumentSummaryView;
import com.unihub.domain.aisummary.UploadStatus;
import com.unihub.domain.aisummary.WorkshopDocument;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcAiSummaryRepository implements AiSummaryRepository {
  private final NamedParameterJdbcTemplate jdbcTemplate;

  public JdbcAiSummaryRepository(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public WorkshopDocument saveDocument(WorkshopDocument document) {
    jdbcTemplate.update("""
        INSERT INTO workshop_documents (
          id, workshop_id, object_key, original_filename, content_type, file_size_bytes,
          checksum, upload_status, uploaded_by_user_id, uploaded_at, created_at, updated_at
        )
        VALUES (
          :id, :workshopId, :objectKey, :originalFilename, :contentType, :fileSize,
          :checksum, :uploadStatus, :uploadedByUserId, :uploadedAt, :createdAt, :updatedAt
        )
        """,
        new MapSqlParameterSource()
            .addValue("id", document.id())
            .addValue("workshopId", document.workshopId())
            .addValue("objectKey", document.objectKey())
            .addValue("originalFilename", document.originalFilename())
            .addValue("contentType", document.contentType())
            .addValue("fileSize", document.fileSize())
            .addValue("checksum", document.checksum())
            .addValue("uploadStatus", document.uploadStatus().name())
            .addValue("uploadedByUserId", document.uploadedByUserId())
            .addValue("uploadedAt", document.uploadedAt())
            .addValue("createdAt", document.createdAt())
            .addValue("updatedAt", document.updatedAt()));
    return document;
  }

  @Override
  public AiSummary savePendingSummary(AiSummary summary) {
    jdbcTemplate.update("""
        INSERT INTO ai_summaries (
          id, document_id, workshop_id, status, summary_text, model_name, attempt_count,
          retry_count, next_retry_at, processing_started_at,
          error_code, error_message, last_error_code, last_error_message,
          started_at, completed_at, generated_at, created_at, updated_at
        )
        VALUES (
          :id, :documentId, :workshopId, :status, :summaryText, :modelName, :attemptCount,
          :retryCount, :nextRetryAt, :processingStartedAt,
          :errorCode, :errorMessage, :errorCode, :errorMessage,
          :startedAt, :completedAt, :generatedAt, :createdAt, :updatedAt
        )
        """,
        summaryParameters(summary));
    return summary;
  }

  @Override
  public Optional<WorkshopDocument> findDocumentById(UUID documentId) {
    return jdbcTemplate.query("""
        SELECT id, workshop_id, object_key, original_filename, content_type, file_size_bytes,
          checksum, upload_status, uploaded_by_user_id, uploaded_at, created_at, updated_at
        FROM workshop_documents
        WHERE id = :documentId
        """,
        Map.of("documentId", documentId),
        documentMapper()).stream().findFirst();
  }

  @Override
  public Optional<DocumentSummaryView> findLatestSummaryByWorkshopId(UUID workshopId) {
    return jdbcTemplate.query("""
        SELECT d.id AS document_id, d.workshop_id, d.upload_status, s.status AS summary_status,
          s.summary_text, COALESCE(s.error_code, s.last_error_code) AS error_code,
          COALESCE(s.error_message, s.last_error_message) AS error_message,
          s.generated_at, s.updated_at
        FROM workshop_documents d
        JOIN ai_summaries s ON s.document_id = d.id
        WHERE d.workshop_id = :workshopId
        ORDER BY d.created_at DESC
        LIMIT 1
        """,
        Map.of("workshopId", workshopId),
        summaryViewMapper()).stream().findFirst();
  }

  @Override
  public Optional<DocumentSummaryView> findSummaryStatusByDocumentId(UUID documentId) {
    return jdbcTemplate.query("""
        SELECT d.id AS document_id, d.workshop_id, d.upload_status, s.status AS summary_status,
          s.summary_text, COALESCE(s.error_code, s.last_error_code) AS error_code,
          COALESCE(s.error_message, s.last_error_message) AS error_message,
          s.generated_at, s.updated_at
        FROM workshop_documents d
        JOIN ai_summaries s ON s.document_id = d.id
        WHERE d.id = :documentId
        """,
        Map.of("documentId", documentId),
        summaryViewMapper()).stream().findFirst();
  }

  @Override
  public List<AiSummary> findPendingSummaries(int limit) {
    return jdbcTemplate.query("""
        SELECT id, document_id, workshop_id, status, summary_text, model_name, attempt_count,
          retry_count, next_retry_at, processing_started_at,
          COALESCE(error_code, last_error_code) AS error_code,
          COALESCE(error_message, last_error_message) AS error_message,
          started_at, completed_at, generated_at, created_at, updated_at
        FROM ai_summaries
        WHERE status = 'PENDING'
          AND (next_retry_at IS NULL OR next_retry_at <= now())
        ORDER BY created_at ASC
        LIMIT :limit
        """,
        Map.of("limit", Math.max(1, limit)),
        summaryMapper());
  }

  @Override
  public List<AiSummary> findStaleProcessingSummaries(LocalDateTime threshold, int limit) {
    return jdbcTemplate.query("""
        SELECT id, document_id, workshop_id, status, summary_text, model_name, attempt_count,
          retry_count, next_retry_at, processing_started_at,
          COALESCE(error_code, last_error_code) AS error_code,
          COALESCE(error_message, last_error_message) AS error_message,
          started_at, completed_at, generated_at, created_at, updated_at
        FROM ai_summaries
        WHERE status = 'PROCESSING'
          AND processing_started_at IS NOT NULL
          AND processing_started_at <= :threshold
        ORDER BY processing_started_at ASC
        LIMIT :limit
        """,
        new MapSqlParameterSource()
            .addValue("threshold", threshold)
            .addValue("limit", Math.max(1, limit)),
        summaryMapper());
  }

  @Override
  public boolean markProcessing(UUID summaryId, LocalDateTime now) {
    int updated = jdbcTemplate.update("""
        UPDATE ai_summaries
        SET status = 'PROCESSING',
          attempt_count = attempt_count + 1,
          processing_started_at = :now,
          started_at = :now,
          updated_at = :now
        WHERE id = :summaryId AND status = 'PENDING'
        """,
        Map.of("summaryId", summaryId, "now", now));
    return updated == 1;
  }

  @Override
  public void markCompleted(UUID summaryId, String summaryText, String modelName, LocalDateTime now) {
    jdbcTemplate.update("""
        UPDATE ai_summaries
        SET status = 'COMPLETED',
          summary_text = :summaryText,
          model_name = :modelName,
          error_code = NULL,
          error_message = NULL,
          last_error_code = NULL,
          last_error_message = NULL,
          next_retry_at = NULL,
          processing_started_at = NULL,
          completed_at = :now,
          generated_at = :now,
          updated_at = :now
        WHERE id = :summaryId
        """,
        new MapSqlParameterSource()
            .addValue("summaryId", summaryId)
            .addValue("summaryText", summaryText)
            .addValue("modelName", modelName)
            .addValue("now", now));
  }

  @Override
  public void markFailed(UUID summaryId, String errorCode, String errorMessage, LocalDateTime now) {
    jdbcTemplate.update("""
        UPDATE ai_summaries
        SET status = 'FAILED',
          error_code = :errorCode,
          error_message = :errorMessage,
          last_error_code = :errorCode,
          last_error_message = :errorMessage,
          next_retry_at = NULL,
          processing_started_at = NULL,
          completed_at = :now,
          updated_at = :now
        WHERE id = :summaryId
        """,
        new MapSqlParameterSource()
            .addValue("summaryId", summaryId)
            .addValue("errorCode", errorCode)
            .addValue("errorMessage", errorMessage)
            .addValue("now", now));
  }

  @Override
  public void markRetryableFailure(
      UUID summaryId,
      int retryCount,
      LocalDateTime nextRetryAt,
      String errorCode,
      String errorMessage,
      LocalDateTime now) {
    jdbcTemplate.update("""
        UPDATE ai_summaries
        SET status = 'PENDING',
          retry_count = :retryCount,
          next_retry_at = :nextRetryAt,
          processing_started_at = NULL,
          error_code = :errorCode,
          error_message = :errorMessage,
          last_error_code = :errorCode,
          last_error_message = :errorMessage,
          updated_at = :now
        WHERE id = :summaryId
        """,
        new MapSqlParameterSource()
            .addValue("summaryId", summaryId)
            .addValue("retryCount", retryCount)
            .addValue("nextRetryAt", nextRetryAt)
            .addValue("errorCode", errorCode)
            .addValue("errorMessage", errorMessage)
            .addValue("now", now));
  }

  private MapSqlParameterSource summaryParameters(AiSummary summary) {
    return new MapSqlParameterSource()
        .addValue("id", summary.id())
        .addValue("documentId", summary.documentId())
        .addValue("workshopId", summary.workshopId())
        .addValue("status", summary.status().name())
        .addValue("summaryText", summary.summaryText())
        .addValue("modelName", summary.modelName())
        .addValue("attemptCount", summary.attemptCount())
        .addValue("retryCount", summary.retryCount())
        .addValue("nextRetryAt", summary.nextRetryAt())
        .addValue("processingStartedAt", summary.processingStartedAt())
        .addValue("errorCode", summary.errorCode())
        .addValue("errorMessage", summary.errorMessage())
        .addValue("startedAt", summary.startedAt())
        .addValue("completedAt", summary.completedAt())
        .addValue("generatedAt", summary.generatedAt())
        .addValue("createdAt", summary.createdAt())
        .addValue("updatedAt", summary.updatedAt());
  }

  private RowMapper<WorkshopDocument> documentMapper() {
    return (rs, rowNum) -> new WorkshopDocument(
        rs.getObject("id", UUID.class),
        rs.getObject("workshop_id", UUID.class),
        rs.getString("object_key"),
        rs.getString("original_filename"),
        rs.getString("content_type"),
        rs.getLong("file_size_bytes"),
        rs.getString("checksum"),
        UploadStatus.valueOf(rs.getString("upload_status")),
        rs.getObject("uploaded_by_user_id", UUID.class),
        getLocalDateTime(rs, "uploaded_at"),
        getLocalDateTime(rs, "created_at"),
        getLocalDateTime(rs, "updated_at"));
  }

  private RowMapper<AiSummary> summaryMapper() {
    return (rs, rowNum) -> new AiSummary(
        rs.getObject("id", UUID.class),
        rs.getObject("document_id", UUID.class),
        rs.getObject("workshop_id", UUID.class),
        AiSummaryStatus.valueOf(rs.getString("status")),
        rs.getString("summary_text"),
        rs.getString("model_name"),
        rs.getInt("attempt_count"),
        rs.getInt("retry_count"),
        rs.getString("error_code"),
        rs.getString("error_message"),
        getLocalDateTime(rs, "started_at"),
        getLocalDateTime(rs, "processing_started_at"),
        getLocalDateTime(rs, "completed_at"),
        getLocalDateTime(rs, "generated_at"),
        getLocalDateTime(rs, "next_retry_at"),
        getLocalDateTime(rs, "created_at"),
        getLocalDateTime(rs, "updated_at"));
  }

  private RowMapper<DocumentSummaryView> summaryViewMapper() {
    return (rs, rowNum) -> new DocumentSummaryView(
        rs.getObject("document_id", UUID.class),
        rs.getObject("workshop_id", UUID.class),
        UploadStatus.valueOf(rs.getString("upload_status")),
        AiSummaryStatus.valueOf(rs.getString("summary_status")),
        rs.getString("summary_text"),
        rs.getString("error_code"),
        rs.getString("error_message"),
        getLocalDateTime(rs, "generated_at"),
        getLocalDateTime(rs, "updated_at"));
  }

  private LocalDateTime getLocalDateTime(ResultSet rs, String columnName) throws SQLException {
    var timestamp = rs.getTimestamp(columnName);
    return timestamp == null ? null : timestamp.toLocalDateTime();
  }
}
