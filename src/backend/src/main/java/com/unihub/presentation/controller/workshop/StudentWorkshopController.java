package com.unihub.presentation.controller.workshop;

import com.unihub.application.workshop.WorkshopQueryService;
import com.unihub.presentation.ApiResponse;
import com.unihub.presentation.dto.response.workshop.WorkshopListResponse;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student/workshops")
public class StudentWorkshopController {
  private final WorkshopQueryService workshopQueryService;

  public StudentWorkshopController(WorkshopQueryService workshopQueryService) {
    this.workshopQueryService = workshopQueryService;
  }

  @GetMapping("/current-week")
  public ResponseEntity<ApiResponse<List<WorkshopListResponse>>> listCurrentWeekWorkshops() {
    return ResponseEntity.ok(ApiResponse.success(workshopQueryService.listPublishedWorkshopsForCurrentWeek()));
  }
}
