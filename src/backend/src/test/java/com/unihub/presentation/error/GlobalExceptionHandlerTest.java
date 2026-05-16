package com.unihub.presentation.error;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.unihub.presentation.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

class GlobalExceptionHandlerTest {
  @Test
  void fallbackMessageDoesNotExposeUnexpectedServerErrorText() {
    GlobalExceptionHandler handler = new GlobalExceptionHandler();

    ResponseEntity<ApiResponse<Void>> response = handler.handleFallback(new RuntimeException("boom"));

    assertEquals(500, response.getStatusCode().value());
    assertEquals("INTERNAL_SERVER_ERROR", response.getBody().getError().code());
    assertFalse(response.getBody().getError().message().contains("Unexpected server error"));
  }
}
