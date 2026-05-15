package com.unihub.presentation.controller.aisummary;

import com.unihub.application.aisummary.AiSummaryCommandService;
import com.unihub.application.aisummary.AiSummaryException;
import com.unihub.application.aisummary.AiSummaryQueryService;
import com.unihub.application.aisummary.UploadWorkshopDocumentCommand;
import com.unihub.application.auth.exception.AuthException;
import com.unihub.domain.aisummary.AiSummaryErrorCode;
import com.unihub.domain.user.UserErrorCode;
import com.unihub.infrastructure.security.UserPrincipal;
import com.unihub.presentation.ApiResponse;
import com.unihub.presentation.dto.response.aisummary.DocumentSummaryStatusResponse;
import com.unihub.presentation.dto.response.aisummary.UploadWorkshopDocumentResponse;
import com.unihub.presentation.dto.response.aisummary.WorkshopAiSummaryResponse;
import com.unihub.presentation.mapper.aisummary.AiSummaryResponseMapper;
import java.io.IOException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class AiSummaryController {
  private final AiSummaryCommandService commandService;
  private final AiSummaryQueryService queryService;
  private final AiSummaryResponseMapper responseMapper;

  public AiSummaryController(
      AiSummaryCommandService commandService,
      AiSummaryQueryService queryService,
      AiSummaryResponseMapper responseMapper) {
    this.commandService = commandService;
    this.queryService = queryService;
    this.responseMapper = responseMapper;
  }

  @PostMapping(
      value = "/admin/workshops/{workshopId}/documents",
      consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<ApiResponse<UploadWorkshopDocumentResponse>> uploadWorkshopDocument(
      @PathVariable UUID workshopId,
      @RequestPart(value = "file", required = false) MultipartFile file,
      Authentication authentication) {
    UUID userId = requireUserId(authentication);
    byte[] bytes = readBytes(file);
    UploadWorkshopDocumentResponse response = responseMapper.toUploadResponse(
        commandService.uploadWorkshopDocument(new UploadWorkshopDocumentCommand(
            workshopId,
            userId,
            file == null ? null : file.getOriginalFilename(),
            file == null ? null : file.getContentType(),
            file == null ? 0 : file.getSize(),
            bytes)));
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @GetMapping("/workshops/{workshopId}/summary")
  public ResponseEntity<ApiResponse<WorkshopAiSummaryResponse>> getWorkshopSummary(
      @PathVariable UUID workshopId) {
    WorkshopAiSummaryResponse response = responseMapper.toWorkshopSummaryResponse(
        queryService.getWorkshopSummary(workshopId));
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @GetMapping("/admin/documents/{documentId}/summary-status")
  public ResponseEntity<ApiResponse<DocumentSummaryStatusResponse>> getDocumentSummaryStatus(
      @PathVariable UUID documentId) {
    DocumentSummaryStatusResponse response = responseMapper.toDocumentStatusResponse(
        queryService.getDocumentSummaryStatus(documentId));
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  private byte[] readBytes(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      return new byte[0];
    }
    try {
      return file.getBytes();
    } catch (IOException ex) {
      throw new AiSummaryException(AiSummaryErrorCode.AI_FILE_REQUIRED, HttpStatus.BAD_REQUEST);
    }
  }

  private UUID requireUserId(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
      throw new AuthException(UserErrorCode.AUTH_TOKEN_MISSING, HttpStatus.UNAUTHORIZED);
    }
    return principal.id();
  }
}
