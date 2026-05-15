package com.unihub.application.aisummary;

import com.unihub.domain.aisummary.AiSummary;
import com.unihub.domain.aisummary.AiSummaryErrorCode;
import com.unihub.domain.aisummary.AiSummaryRepository;
import com.unihub.domain.aisummary.WorkshopDocument;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AiSummaryWorkerService {
  private final AiSummaryRepository aiSummaryRepository;
  private final ObjectStorageService objectStorageService;
  private final PdfTextExtractor pdfTextExtractor;
  private final AiTextCleaner aiTextCleaner;
  private final AiSummaryProvider aiSummaryProvider;

  public AiSummaryWorkerService(
      AiSummaryRepository aiSummaryRepository,
      ObjectStorageService objectStorageService,
      PdfTextExtractor pdfTextExtractor,
      AiTextCleaner aiTextCleaner,
      AiSummaryProvider aiSummaryProvider) {
    this.aiSummaryRepository = aiSummaryRepository;
    this.objectStorageService = objectStorageService;
    this.pdfTextExtractor = pdfTextExtractor;
    this.aiTextCleaner = aiTextCleaner;
    this.aiSummaryProvider = aiSummaryProvider;
  }

  public int processPendingBatch(int limit) {
    List<AiSummary> summaries = aiSummaryRepository.findPendingSummaries(limit);
    int processed = 0;
    for (AiSummary summary : summaries) {
      processPendingSummary(summary);
      processed++;
    }
    return processed;
  }

  public void processPendingSummary(AiSummary summary) {
    LocalDateTime now = LocalDateTime.now();
    if (!aiSummaryRepository.markProcessing(summary.id(), now)) {
      return;
    }

    try {
      WorkshopDocument document = aiSummaryRepository.findDocumentById(summary.documentId())
          .orElseThrow(() -> new AiSummaryProviderException(
              AiSummaryErrorCode.AI_DOCUMENT_NOT_FOUND,
              AiSummaryErrorCode.AI_DOCUMENT_NOT_FOUND.defaultMessage()));
      byte[] pdfBytes = objectStorageService.getObject(document.objectKey());
      String extractedText = pdfTextExtractor.extractText(pdfBytes);
      String cleanedText = aiTextCleaner.clean(extractedText);
      if (cleanedText.isBlank()) {
        fail(summary, AiSummaryErrorCode.AI_TEXT_EMPTY, AiSummaryErrorCode.AI_TEXT_EMPTY.defaultMessage());
        return;
      }

      String summaryText = aiSummaryProvider.summarize(cleanedText);
      if (summaryText == null || summaryText.isBlank()) {
        fail(summary, AiSummaryErrorCode.AI_OUTPUT_INVALID, AiSummaryErrorCode.AI_OUTPUT_INVALID.defaultMessage());
        return;
      }

      aiSummaryRepository.markCompleted(
          summary.id(),
          summaryText.trim(),
          aiSummaryProvider.modelName(),
          LocalDateTime.now());
    } catch (AiSummaryProviderException ex) {
      fail(summary, ex.getErrorCode(), ex.getMessage());
    } catch (ObjectStorageException ex) {
      fail(summary, AiSummaryErrorCode.AI_STORAGE_UNAVAILABLE,
          AiSummaryErrorCode.AI_STORAGE_UNAVAILABLE.defaultMessage());
    } catch (Exception ex) {
      fail(summary, AiSummaryErrorCode.AI_SUMMARY_FAILED,
          AiSummaryErrorCode.AI_SUMMARY_FAILED.defaultMessage());
    }
  }

  private void fail(AiSummary summary, AiSummaryErrorCode errorCode, String message) {
    aiSummaryRepository.markFailed(summary.id(), errorCode.code(), message, LocalDateTime.now());
  }
}
