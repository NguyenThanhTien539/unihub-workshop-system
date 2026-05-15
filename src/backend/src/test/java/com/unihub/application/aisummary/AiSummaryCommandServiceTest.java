package com.unihub.application.aisummary;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.unihub.domain.aisummary.AiSummary;
import com.unihub.domain.aisummary.AiSummaryErrorCode;
import com.unihub.domain.aisummary.AiSummaryRepository;
import com.unihub.domain.aisummary.AiSummaryStatus;
import com.unihub.domain.aisummary.DocumentSummaryView;
import com.unihub.domain.aisummary.WorkshopDocument;
import com.unihub.domain.workshop.FeeType;
import com.unihub.domain.workshop.Workshop;
import com.unihub.domain.workshop.WorkshopRepository;
import com.unihub.domain.workshop.WorkshopSession;
import com.unihub.domain.workshop.WorkshopSessionView;
import com.unihub.domain.workshop.WorkshopStatus;
import com.unihub.infrastructure.config.AiSummaryProperties;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AiSummaryCommandServiceTest {
  private FakeAiSummaryRepository repository;
  private FakeObjectStorageService objectStorageService;
  private AiSummaryCommandService service;

  @BeforeEach
  void setUp() {
    repository = new FakeAiSummaryRepository();
    objectStorageService = new FakeObjectStorageService();
    service = new AiSummaryCommandService(
        new FakeWorkshopRepository(true),
        repository,
        objectStorageService,
        properties(1));
  }

  @Test
  void validPdfUploadStoresDocumentMetadataAndCreatesPendingSummary() {
    UUID workshopId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    WorkshopDocumentUploadResult result = service.uploadWorkshopDocument(new UploadWorkshopDocumentCommand(
        workshopId,
        userId,
        "agenda.pdf",
        "application/pdf",
        5,
        "%PDF\n".getBytes()));

    assertEquals(workshopId, result.workshopId());
    assertEquals(AiSummaryStatus.PENDING, result.summaryStatus());
    assertEquals(1, objectStorageService.putCount);
    assertEquals(1, repository.documents.size());
    assertEquals(1, repository.summaries.size());
    assertEquals(AiSummaryStatus.PENDING, repository.summaries.getFirst().status());
    assertEquals(result.documentId(), repository.documents.getFirst().id());
  }

  @Test
  void rejectsMissingFile() {
    AiSummaryException ex = assertThrows(AiSummaryException.class,
        () -> service.uploadWorkshopDocument(new UploadWorkshopDocumentCommand(
            UUID.randomUUID(), UUID.randomUUID(), "agenda.pdf", "application/pdf", 0, new byte[0])));

    assertEquals(AiSummaryErrorCode.AI_FILE_REQUIRED, ex.getErrorCode());
    assertEquals(0, objectStorageService.putCount);
  }

  @Test
  void rejectsNonPdfFile() {
    AiSummaryException ex = assertThrows(AiSummaryException.class,
        () -> service.uploadWorkshopDocument(new UploadWorkshopDocumentCommand(
            UUID.randomUUID(), UUID.randomUUID(), "agenda.txt", "text/plain", 4, "test".getBytes())));

    assertEquals(AiSummaryErrorCode.AI_FILE_TYPE_INVALID, ex.getErrorCode());
    assertEquals(0, objectStorageService.putCount);
  }

  @Test
  void rejectsTooLargeFileBeforeStorage() {
    AiSummaryException ex = assertThrows(AiSummaryException.class,
        () -> service.uploadWorkshopDocument(new UploadWorkshopDocumentCommand(
            UUID.randomUUID(),
            UUID.randomUUID(),
            "agenda.pdf",
            "application/pdf",
            2 * 1024 * 1024,
            new byte[] {1, 2, 3})));

    assertEquals(AiSummaryErrorCode.AI_FILE_TOO_LARGE, ex.getErrorCode());
    assertEquals(0, objectStorageService.putCount);
  }

  private static AiSummaryProperties properties(long maxFileSizeMb) {
    return new AiSummaryProperties(
        true,
        "gemini",
        true,
        5000,
        maxFileSizeMb,
        20_000,
        30,
        new AiSummaryProperties.Storage("local", "./data/object-storage/workshop-documents"),
        new AiSummaryProperties.Gemini("", "https://generativelanguage.googleapis.com", "gemini-2.5-flash-lite"));
  }

  private static class FakeObjectStorageService implements ObjectStorageService {
    int putCount;

    @Override
    public String putObject(String objectKey, String contentType, byte[] bytes) {
      putCount++;
      return objectKey;
    }

    @Override
    public byte[] getObject(String objectKey) {
      return new byte[0];
    }
  }

  private static class FakeAiSummaryRepository implements AiSummaryRepository {
    final List<WorkshopDocument> documents = new ArrayList<>();
    final List<AiSummary> summaries = new ArrayList<>();

    @Override
    public WorkshopDocument saveDocument(WorkshopDocument document) {
      documents.add(document);
      return document;
    }

    @Override
    public AiSummary savePendingSummary(AiSummary summary) {
      summaries.add(summary);
      return summary;
    }

    @Override
    public Optional<WorkshopDocument> findDocumentById(UUID documentId) {
      return Optional.empty();
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
      return List.of();
    }

    @Override
    public boolean markProcessing(UUID summaryId, LocalDateTime now) {
      return false;
    }

    @Override
    public void markCompleted(UUID summaryId, String summaryText, String modelName, LocalDateTime now) {
    }

    @Override
    public void markFailed(UUID summaryId, String errorCode, String errorMessage, LocalDateTime now) {
    }
  }

  private static class FakeWorkshopRepository implements WorkshopRepository {
    private final boolean exists;

    FakeWorkshopRepository(boolean exists) {
      this.exists = exists;
    }

    @Override
    public Optional<Workshop> findById(UUID workshopId) {
      return exists
          ? Optional.of(new Workshop(workshopId, "AI", "Speaker", "Desc", WorkshopStatus.DRAFT,
              UUID.randomUUID(), LocalDateTime.now(), LocalDateTime.now(), null, null))
          : Optional.empty();
    }

    @Override public List<Workshop> findWorkshops(String keyword, WorkshopStatus status, Integer page, Integer size) { return List.of(); }
    @Override public List<WorkshopSessionView> findPublishedWorkshopSessions(String keyword, FeeType feeType, UUID roomId, LocalDateTime startAt, LocalDateTime endAt, Integer page, Integer size) { return List.of(); }
    @Override public Optional<WorkshopSession> findSessionById(UUID sessionId) { return Optional.empty(); }
    @Override public List<WorkshopSessionView> findWorkshopSessions(UUID workshopId, boolean includeCanceled) { return List.of(); }
    @Override public List<WorkshopSession> findSessionsByWorkshopId(UUID workshopId) { return List.of(); }
    @Override public Workshop save(Workshop workshop) { return workshop; }
    @Override public Workshop update(Workshop workshop) { return workshop; }
    @Override public WorkshopSession saveSession(WorkshopSession session) { return session; }
    @Override public WorkshopSession updateSession(WorkshopSession session) { return session; }
    @Override public void updateWorkshopStatus(UUID workshopId, WorkshopStatus status, LocalDateTime publishedAt, LocalDateTime canceledAt) { }
    @Override public int cancelSessionsByWorkshopId(UUID workshopId, LocalDateTime canceledAt) { return 0; }
    @Override public boolean existsRoomConflict(UUID roomId, LocalDateTime startAt, LocalDateTime endAt, UUID excludeSessionId) { return false; }
  }
}
