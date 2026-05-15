package com.unihub.presentation.mapper.aisummary;

import com.unihub.application.aisummary.DocumentSummaryStatusResult;
import com.unihub.application.aisummary.WorkshopDocumentUploadResult;
import com.unihub.application.aisummary.WorkshopSummaryResult;
import com.unihub.presentation.dto.response.aisummary.DocumentSummaryStatusResponse;
import com.unihub.presentation.dto.response.aisummary.UploadWorkshopDocumentResponse;
import com.unihub.presentation.dto.response.aisummary.WorkshopAiSummaryResponse;
import org.springframework.stereotype.Component;

@Component
public class AiSummaryResponseMapper {
  public UploadWorkshopDocumentResponse toUploadResponse(WorkshopDocumentUploadResult result) {
    return new UploadWorkshopDocumentResponse(
        result.documentId(),
        result.workshopId(),
        result.uploadStatus().name(),
        result.summaryStatus().name());
  }

  public WorkshopAiSummaryResponse toWorkshopSummaryResponse(WorkshopSummaryResult result) {
    return new WorkshopAiSummaryResponse(
        result.workshopId(),
        result.documentId(),
        result.summaryStatus() == null ? null : result.summaryStatus().name(),
        result.summaryText(),
        result.generatedAt(),
        result.errorCode());
  }

  public DocumentSummaryStatusResponse toDocumentStatusResponse(DocumentSummaryStatusResult result) {
    return new DocumentSummaryStatusResponse(
        result.documentId(),
        result.workshopId(),
        result.uploadStatus().name(),
        result.summaryStatus().name(),
        result.updatedAt());
  }
}
