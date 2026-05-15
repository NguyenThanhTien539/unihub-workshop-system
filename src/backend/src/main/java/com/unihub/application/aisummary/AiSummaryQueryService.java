package com.unihub.application.aisummary;

import com.unihub.domain.aisummary.AiSummaryErrorCode;
import com.unihub.domain.aisummary.AiSummaryRepository;
import com.unihub.domain.aisummary.AiSummaryStatus;
import com.unihub.domain.aisummary.DocumentSummaryView;
import com.unihub.domain.workshop.Workshop;
import com.unihub.domain.workshop.WorkshopRepository;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class AiSummaryQueryService {
  private final WorkshopRepository workshopRepository;
  private final AiSummaryRepository aiSummaryRepository;

  public AiSummaryQueryService(
      WorkshopRepository workshopRepository,
      AiSummaryRepository aiSummaryRepository) {
    this.workshopRepository = workshopRepository;
    this.aiSummaryRepository = aiSummaryRepository;
  }

  public WorkshopSummaryResult getWorkshopSummary(UUID workshopId) {
    Workshop workshop = workshopRepository.findById(workshopId)
        .orElseThrow(() -> new AiSummaryException(
            AiSummaryErrorCode.AI_WORKSHOP_NOT_FOUND,
            HttpStatus.NOT_FOUND));

    Optional<DocumentSummaryView> summary = aiSummaryRepository.findLatestSummaryByWorkshopId(workshop.id());
    if (summary.isEmpty()) {
      return new WorkshopSummaryResult(
          workshop.id(),
          null,
          null,
          null,
          null,
          null);
    }

    DocumentSummaryView view = summary.get();
    return new WorkshopSummaryResult(
        view.workshopId(),
        view.documentId(),
        view.summaryStatus(),
        view.summaryStatus() == AiSummaryStatus.COMPLETED ? view.summaryText() : null,
        view.generatedAt(),
        view.summaryStatus() == AiSummaryStatus.FAILED ? view.errorCode() : null);
  }

  public DocumentSummaryStatusResult getDocumentSummaryStatus(UUID documentId) {
    DocumentSummaryView view = aiSummaryRepository.findSummaryStatusByDocumentId(documentId)
        .orElseThrow(() -> new AiSummaryException(
            AiSummaryErrorCode.AI_DOCUMENT_NOT_FOUND,
            HttpStatus.NOT_FOUND));
    return new DocumentSummaryStatusResult(
        view.documentId(),
        view.workshopId(),
        view.uploadStatus(),
        view.summaryStatus(),
        view.updatedAt());
  }
}
