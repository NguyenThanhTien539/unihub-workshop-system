package com.unihub.presentation.controller.workshop;

import com.unihub.application.workshop.WorkshopQueryService;
import com.unihub.domain.workshop.FeeType;
import com.unihub.presentation.ApiResponse;
import com.unihub.presentation.dto.response.workshop.WorkshopDetailResponse;
import com.unihub.presentation.dto.response.workshop.WorkshopListResponse;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workshops")
public class WorkshopController {
  private final WorkshopQueryService workshopQueryService;

  public WorkshopController(WorkshopQueryService workshopQueryService) {
    this.workshopQueryService = workshopQueryService;
  }

  @GetMapping
  public ResponseEntity<ApiResponse<List<WorkshopListResponse>>> listWorkshops(
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) FeeType feeType,
      @RequestParam(required = false) UUID roomId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer size) {
    List<WorkshopListResponse> responses = workshopQueryService.listPublishedWorkshops(
        keyword,
        feeType,
        roomId,
        date,
        page,
        size);
    return ResponseEntity.ok(ApiResponse.success(responses));
  }

  @GetMapping("/{workshopId}")
  public ResponseEntity<ApiResponse<WorkshopDetailResponse>> getWorkshopDetail(@PathVariable UUID workshopId) {
    WorkshopDetailResponse response = workshopQueryService.getPublishedWorkshopDetail(workshopId);
    return ResponseEntity.ok(ApiResponse.success(response));
  }
}
