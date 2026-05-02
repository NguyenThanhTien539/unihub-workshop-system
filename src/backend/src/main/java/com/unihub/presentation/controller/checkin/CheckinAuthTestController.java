package com.unihub.presentation.controller.checkin;

import com.unihub.presentation.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/checkin")
public class CheckinAuthTestController {
  @GetMapping("/auth-test")
  public ApiResponse<String> authTest() {
    return ApiResponse.success("checkin ok");
  }
}

