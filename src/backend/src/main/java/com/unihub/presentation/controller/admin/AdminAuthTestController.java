package com.unihub.presentation.controller.admin;

import com.unihub.presentation.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminAuthTestController {
  @GetMapping("/auth-test")
  public ResponseEntity<ApiResponse<String>> authTest() {
    return ResponseEntity.ok(ApiResponse.success("admin ok"));
  }
}
