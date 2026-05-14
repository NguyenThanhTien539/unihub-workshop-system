package com.unihub.infrastructure.security;

import com.unihub.presentation.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RbacSecurityTestEndpoints {
  @GetMapping("/api/workshops")
  ApiResponse<String> workshops() {
    return ApiResponse.success("public workshops");
  }

  @GetMapping("/api/auth/me")
  ApiResponse<String> me() {
    return ApiResponse.success("me");
  }

  @GetMapping("/api/admin/auth-test")
  ApiResponse<String> admin() {
    return ApiResponse.success("admin");
  }

  @GetMapping("/api/admin/csv-imports/{id}")
  ApiResponse<String> csvImport(@PathVariable String id) {
    return ApiResponse.success(id);
  }

  @GetMapping("/api/registrations/auth-test")
  ApiResponse<String> registrations() {
    return ApiResponse.success("registrations");
  }

  @PostMapping("/api/payments/intents")
  ApiResponse<String> paymentIntent() {
    return ApiResponse.success("payment intent");
  }

  @GetMapping("/api/payments/{id}/status")
  ApiResponse<String> paymentStatus(@PathVariable String id) {
    return ApiResponse.success(id);
  }

  @PostMapping("/api/payments/zalopay/callback")
  ApiResponse<String> zalopayCallback() {
    return ApiResponse.success("zalopay callback");
  }

  @GetMapping("/api/checkin/sessions")
  ApiResponse<String> checkinSessions() {
    return ApiResponse.success("checkin sessions");
  }

  @PostMapping("/api/checkin/validate")
  ApiResponse<String> checkinValidate() {
    return ApiResponse.success("checkin validate");
  }

  @PostMapping("/api/checkin/sync")
  ApiResponse<String> checkinSync() {
    return ApiResponse.success("checkin sync");
  }

  @GetMapping("/api/notifications/me")
  ApiResponse<String> notifications() {
    return ApiResponse.success("notifications");
  }

  @PatchMapping("/api/notifications/{id}/read")
  ApiResponse<String> readNotification(@PathVariable String id) {
    return ApiResponse.success(id);
  }
}
