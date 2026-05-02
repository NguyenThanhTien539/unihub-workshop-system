package com.unihub.presentation.controller.registration;

import com.unihub.presentation.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/registrations")
public class RegistrationAuthTestController {
  @GetMapping("/auth-test")
  public ApiResponse<String> authTest() {
    return ApiResponse.success("registration ok");
  }
}

