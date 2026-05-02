package com.unihub.presentation.controller.admin;

import com.unihub.presentation.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminAuthTestController {
  @GetMapping("/auth-test")
  public ApiResponse<String> authTest() {
    return ApiResponse.success("admin ok");
  }
}

