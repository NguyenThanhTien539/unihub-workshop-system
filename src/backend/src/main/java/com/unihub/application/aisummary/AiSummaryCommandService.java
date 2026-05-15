package com.unihub.application.aisummary;

import com.unihub.domain.aisummary.AiSummary;
import com.unihub.domain.aisummary.AiSummaryErrorCode;
import com.unihub.domain.aisummary.AiSummaryStatus;
import com.unihub.domain.aisummary.AiSummaryRepository;
import com.unihub.domain.aisummary.UploadStatus;
import com.unihub.domain.aisummary.WorkshopDocument;
import com.unihub.domain.workshop.WorkshopRepository;
import com.unihub.infrastructure.config.AiSummaryProperties;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiSummaryCommandService {
  private final WorkshopRepository workshopRepository;
  private final AiSummaryRepository aiSummaryRepository;
  private final ObjectStorageService objectStorageService;
  private final AiSummaryProperties properties;

  public AiSummaryCommandService(
      WorkshopRepository workshopRepository,
      AiSummaryRepository aiSummaryRepository,
      ObjectStorageService objectStorageService,
      AiSummaryProperties properties) {
    this.workshopRepository = workshopRepository;
    this.aiSummaryRepository = aiSummaryRepository;
    this.objectStorageService = objectStorageService;
    this.properties = properties;
  }

  @Transactional
  public WorkshopDocumentUploadResult uploadWorkshopDocument(UploadWorkshopDocumentCommand command) {
    validateUpload(command);
    workshopRepository.findById(command.workshopId())
        .orElseThrow(() -> new AiSummaryException(
            AiSummaryErrorCode.AI_WORKSHOP_NOT_FOUND,
            HttpStatus.NOT_FOUND));

    UUID documentId = UUID.randomUUID();
    LocalDateTime now = LocalDateTime.now();
    String objectKey = "workshop-documents/" + command.workshopId() + "/" + documentId + ".pdf";

    try {
      objectStorageService.putObject(objectKey, "application/pdf", command.bytes());
    } catch (ObjectStorageException ex) {
      throw new AiSummaryException(
          AiSummaryErrorCode.AI_STORAGE_UNAVAILABLE,
          HttpStatus.SERVICE_UNAVAILABLE,
          AiSummaryErrorCode.AI_STORAGE_UNAVAILABLE.defaultMessage());
    }

    WorkshopDocument document = new WorkshopDocument(
        documentId,
        command.workshopId(),
        objectKey,
        command.originalFilename(),
        command.contentType(),
        command.fileSize(),
        sha256(command.bytes()),
        UploadStatus.UPLOADED,
        command.uploadedByUserId(),
        now,
        now,
        now);
    aiSummaryRepository.saveDocument(document);

    AiSummary summary = new AiSummary(
        UUID.randomUUID(),
        documentId,
        command.workshopId(),
        AiSummaryStatus.PENDING,
        null,
        null,
        0,
        null,
        null,
        null,
        null,
        null,
        now,
        now);
    aiSummaryRepository.savePendingSummary(summary);

    return new WorkshopDocumentUploadResult(
        documentId,
        command.workshopId(),
        UploadStatus.UPLOADED,
        AiSummaryStatus.PENDING);
  }

  private void validateUpload(UploadWorkshopDocumentCommand command) {
    if (command.bytes() == null || command.bytes().length == 0 || command.fileSize() <= 0) {
      throw new AiSummaryException(AiSummaryErrorCode.AI_FILE_REQUIRED, HttpStatus.BAD_REQUEST);
    }
    if (command.fileSize() > properties.maxFileSizeBytes()) {
      throw new AiSummaryException(AiSummaryErrorCode.AI_FILE_TOO_LARGE, HttpStatus.PAYLOAD_TOO_LARGE);
    }
    if (!isPdf(command.originalFilename(), command.contentType())) {
      throw new AiSummaryException(AiSummaryErrorCode.AI_FILE_TYPE_INVALID, HttpStatus.BAD_REQUEST);
    }
  }

  private boolean isPdf(String originalFilename, String contentType) {
    String filename = originalFilename == null ? "" : originalFilename.toLowerCase(Locale.ROOT);
    String normalizedContentType = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
    return filename.endsWith(".pdf") && normalizedContentType.contains("pdf");
  }

  private String sha256(byte[] bytes) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    } catch (NoSuchAlgorithmException ex) {
      throw new IllegalStateException("SHA-256 is not available", ex);
    }
  }
}
