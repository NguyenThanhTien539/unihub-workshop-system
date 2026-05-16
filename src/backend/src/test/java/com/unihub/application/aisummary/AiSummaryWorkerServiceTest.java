package com.unihub.application.aisummary;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.unihub.domain.aisummary.AiSummary;
import com.unihub.domain.aisummary.AiSummaryErrorCode;
import com.unihub.domain.aisummary.AiSummaryRepository;
import com.unihub.domain.aisummary.AiSummaryStatus;
import com.unihub.domain.aisummary.DocumentSummaryView;
import com.unihub.domain.aisummary.UploadStatus;
import com.unihub.domain.aisummary.WorkshopDocument;
import com.unihub.infrastructure.config.AiSummaryProperties;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AiSummaryWorkerServiceTest {
  private FakeAiSummaryRepository repository;
  private FakeObjectStorageService storage;
  private FakePdfTextExtractor extractor;
  private FakeAiSummaryProvider provider;
  private AiSummaryWorkerService service;

  @BeforeEach
  void setUp() {
    repository = new FakeAiSummaryRepository();
    storage = new FakeObjectStorageService();
    extractor = new FakePdfTextExtractor();
    provider = new FakeAiSummaryProvider();
    service = new AiSummaryWorkerService(
        repository,
        storage,
        extractor,
        new AiTextCleaner(properties()),
        provider,
        properties());
  }

  @Test
  void workerCompletesPendingSummaryWhenProviderSucceeds() {
    service.processPendingSummary(repository.summary);

    assertEquals(AiSummaryStatus.COMPLETED, repository.status);
    assertEquals("Tom tat ngan gon", repository.summaryText);
    assertEquals("gemini-2.5-flash-lite", repository.modelName);
    assertEquals(1, storage.getCount);
    assertEquals(1, provider.callCount);
  }

  @Test
  void workerFailsWhenPdfTextIsEmpty() {
    extractor.text = "   ";

    service.processPendingSummary(repository.summary);

    assertEquals(AiSummaryStatus.FAILED, repository.status);
    assertEquals(AiSummaryErrorCode.AI_TEXT_EMPTY.code(), repository.errorCode);
    assertEquals(0, provider.callCount);
  }

  @Test
  void workerFailsWhenPdfIsInvalid() {
    extractor.errorCode = AiSummaryErrorCode.AI_PDF_INVALID;

    service.processPendingSummary(repository.summary);

    assertEquals(AiSummaryStatus.FAILED, repository.status);
    assertEquals(AiSummaryErrorCode.AI_PDF_INVALID.code(), repository.errorCode);
  }

  @Test
  void workerFailsWhenProviderTimesOut() {
    provider.errorCode = AiSummaryErrorCode.AI_PROVIDER_TIMEOUT;

    service.processPendingSummary(repository.summary);

    assertEquals(AiSummaryStatus.FAILED, repository.status);
    assertEquals(AiSummaryErrorCode.AI_PROVIDER_TIMEOUT.code(), repository.errorCode);
  }

  @Test
  void workerRetriesWhenObjectStorageReadFailsTemporarily() {
    storage.failGet = true;

    service.processPendingSummary(repository.summary);

    assertEquals(AiSummaryStatus.PENDING, repository.status);
    assertEquals(AiSummaryErrorCode.AI_STORAGE_UNAVAILABLE.code(), repository.errorCode);
    assertEquals(1, repository.retryCount);
  }

  @Test
  void workerMarksFailedAfterMaxStorageRetries() {
    storage.failGet = true;
    repository.summary = repository.summaryWithRetryCount(3);

    service.processPendingSummary(repository.summary);

    assertEquals(AiSummaryStatus.FAILED, repository.status);
    assertEquals(AiSummaryErrorCode.AI_STORAGE_UNAVAILABLE.code(), repository.errorCode);
  }

  @Test
  void workerRecoversStaleProcessingSummary() {
    repository.pendingSummaries = List.of();
    repository.staleSummaries = List.of(repository.summaryWithStatus(AiSummaryStatus.PROCESSING));

    service.processPendingBatch(5);

    assertEquals(AiSummaryStatus.PENDING, repository.status);
    assertEquals(1, repository.retryCount);
  }

  private static AiSummaryProperties properties() {
    return new AiSummaryProperties(
        true,
        "gemini",
        true,
        5000,
        10,
        20_000,
        30,
        new AiSummaryProperties.Storage(
            "local",
            "./data/object-storage/workshop-documents",
            "unihub-documents",
            "http://minio:9000",
            "ap-southeast-1",
            "",
            ""),
        new AiSummaryProperties.Worker(3, 5000, 3.0, 120_000),
        new AiSummaryProperties.Gemini("", "https://generativelanguage.googleapis.com", "gemini-2.5-flash-lite"));
  }

  private static class FakeObjectStorageService implements ObjectStorageService {
    int getCount;
    boolean failGet;

    @Override
    public String putObject(String objectKey, String contentType, byte[] bytes) {
      return objectKey;
    }

    @Override
    public byte[] getObject(String objectKey) {
      getCount++;
      if (failGet) {
        throw new ObjectStorageException("Storage unavailable", null, true);
      }
      return "%PDF\n".getBytes();
    }
  }

  private static class FakePdfTextExtractor implements PdfTextExtractor {
    String text = "Noi dung workshop ve AI";
    AiSummaryErrorCode errorCode;

    @Override
    public String extractText(byte[] pdfBytes) {
      if (errorCode != null) {
        throw new AiSummaryProviderException(errorCode);
      }
      return text;
    }
  }

  private static class FakeAiSummaryProvider implements AiSummaryProvider {
    int callCount;
    AiSummaryErrorCode errorCode;

    @Override
    public String summarize(String cleanedText) {
      callCount++;
      if (errorCode != null) {
        throw new AiSummaryProviderException(errorCode);
      }
      return "Tom tat ngan gon";
    }

    @Override
    public String modelName() {
      return "gemini-2.5-flash-lite";
    }
  }

  private static class FakeAiSummaryRepository implements AiSummaryRepository {
    final UUID documentId = UUID.randomUUID();
    final UUID workshopId = UUID.randomUUID();
    AiSummary summary = new AiSummary(
        UUID.randomUUID(),
        documentId,
        workshopId,
        AiSummaryStatus.PENDING,
        null,
        null,
        0,
        0,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        LocalDateTime.now(),
        LocalDateTime.now());
    List<AiSummary> pendingSummaries = List.of(summary);
    List<AiSummary> staleSummaries = List.of();
    AiSummaryStatus status = AiSummaryStatus.PENDING;
    String summaryText;
    String modelName;
    String errorCode;
    int retryCount;

    @Override
    public WorkshopDocument saveDocument(WorkshopDocument document) {
      return document;
    }

    @Override
    public AiSummary savePendingSummary(AiSummary summary) {
      return summary;
    }

    @Override
    public Optional<WorkshopDocument> findDocumentById(UUID documentId) {
      return Optional.of(new WorkshopDocument(
          documentId,
          workshopId,
          "workshop-documents/" + workshopId + "/" + documentId + ".pdf",
          "agenda.pdf",
          "application/pdf",
          42,
          "checksum",
          UploadStatus.UPLOADED,
          UUID.randomUUID(),
          LocalDateTime.now(),
          LocalDateTime.now(),
          LocalDateTime.now()));
    }

    @Override
    public Optional<DocumentSummaryView> findLatestSummaryByWorkshopId(UUID workshopId) {
      return Optional.empty();
    }

    @Override
    public Optional<DocumentSummaryView> findSummaryStatusByDocumentId(UUID documentId) {
      return Optional.empty();
    }

    @Override
    public List<AiSummary> findPendingSummaries(int limit) {
      return pendingSummaries;
    }

    @Override
    public List<AiSummary> findStaleProcessingSummaries(LocalDateTime threshold, int limit) {
      return staleSummaries;
    }

    @Override
    public boolean markProcessing(UUID summaryId, LocalDateTime now) {
      status = AiSummaryStatus.PROCESSING;
      return true;
    }

    @Override
    public void markCompleted(UUID summaryId, String summaryText, String modelName, LocalDateTime now) {
      status = AiSummaryStatus.COMPLETED;
      this.summaryText = summaryText;
      this.modelName = modelName;
    }

    @Override
    public void markFailed(UUID summaryId, String errorCode, String errorMessage, LocalDateTime now) {
      status = AiSummaryStatus.FAILED;
      this.errorCode = errorCode;
    }

    @Override
    public void markRetryableFailure(
        UUID summaryId,
        int retryCount,
        LocalDateTime nextRetryAt,
        String errorCode,
        String errorMessage,
        LocalDateTime now) {
      status = AiSummaryStatus.PENDING;
      this.retryCount = retryCount;
      this.errorCode = errorCode;
    }

    AiSummary summaryWithRetryCount(int retryCount) {
      return new AiSummary(
          summary.id(),
          summary.documentId(),
          summary.workshopId(),
          summary.status(),
          summary.summaryText(),
          summary.modelName(),
          summary.attemptCount(),
          retryCount,
          summary.errorCode(),
          summary.errorMessage(),
          summary.startedAt(),
          summary.processingStartedAt(),
          summary.completedAt(),
          summary.generatedAt(),
          summary.nextRetryAt(),
          summary.createdAt(),
          summary.updatedAt());
    }

    AiSummary summaryWithStatus(AiSummaryStatus status) {
      return new AiSummary(
          summary.id(),
          summary.documentId(),
          summary.workshopId(),
          status,
          summary.summaryText(),
          summary.modelName(),
          summary.attemptCount(),
          summary.retryCount(),
          summary.errorCode(),
          summary.errorMessage(),
          summary.startedAt(),
          LocalDateTime.now().minusMinutes(5),
          summary.completedAt(),
          summary.generatedAt(),
          summary.nextRetryAt(),
          summary.createdAt(),
          summary.updatedAt());
    }
  }
}
