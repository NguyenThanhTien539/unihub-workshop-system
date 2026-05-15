package com.unihub.domain.aisummary;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AiSummaryRepository {
  WorkshopDocument saveDocument(WorkshopDocument document);

  AiSummary savePendingSummary(AiSummary summary);

  Optional<WorkshopDocument> findDocumentById(UUID documentId);

  Optional<DocumentSummaryView> findLatestSummaryByWorkshopId(UUID workshopId);

  Optional<DocumentSummaryView> findSummaryStatusByDocumentId(UUID documentId);

  List<AiSummary> findPendingSummaries(int limit);

  boolean markProcessing(UUID summaryId, LocalDateTime now);

  void markCompleted(UUID summaryId, String summaryText, String modelName, LocalDateTime now);

  void markFailed(UUID summaryId, String errorCode, String errorMessage, LocalDateTime now);
}
