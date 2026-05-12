package com.unihub.presentation.controller.admin;

import com.unihub.application.workshop.WorkshopQueryService;
import com.unihub.presentation.ApiResponse;
import com.unihub.presentation.dto.response.workshop.RoomResponse;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/rooms")
public class AdminRoomController {
  private final WorkshopQueryService workshopQueryService;

  public AdminRoomController(WorkshopQueryService workshopQueryService) {
    this.workshopQueryService = workshopQueryService;
  }

  @GetMapping
  public ResponseEntity<ApiResponse<List<RoomResponse>>> listRooms(
      @RequestParam(name = "includeInactive", required = false, defaultValue = "false") boolean includeInactive) {
    List<RoomResponse> responses = workshopQueryService.listRooms(includeInactive);
    return ResponseEntity.ok(ApiResponse.success(responses));
  }
}
