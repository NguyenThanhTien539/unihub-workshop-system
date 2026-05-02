package com.unihub.presentation.error;

import com.unihub.application.auth.exception.AuthException;
import com.unihub.domain.user.UserErrorCode;
import com.unihub.presentation.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(AuthException.class)
  public ResponseEntity<ApiResponse<Void>> handleAuthException(AuthException ex) {
    ApiResponse<Void> body = ApiResponse.error(ex.getErrorCode().code(), ex.getMessage());
    return ResponseEntity.status(ex.getStatus()).body(body);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<Void>> handleValidationException(
      MethodArgumentNotValidException ex,
      HttpServletRequest request
  ) {
    if (request.getRequestURI().equals("/api/auth/refresh")) {
      ApiResponse<Void> body = ApiResponse.error(
          UserErrorCode.AUTH_REFRESH_TOKEN_MISSING.code(),
          UserErrorCode.AUTH_REFRESH_TOKEN_MISSING.defaultMessage()
      );
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    String message = ex.getBindingResult().getFieldErrors().stream()
        .map(err -> err.getField() + " " + err.getDefaultMessage())
        .collect(Collectors.joining("; "));

    ApiResponse<Void> body = ApiResponse.error("REQUEST_VALIDATION_ERROR", message);
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(AccessDeniedException ex) {
    ApiResponse<Void> body = ApiResponse.error(
        UserErrorCode.AUTH_FORBIDDEN.code(),
        UserErrorCode.AUTH_FORBIDDEN.defaultMessage()
    );
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> handleFallback(Exception ex) {
    ApiResponse<Void> body = ApiResponse.error("INTERNAL_SERVER_ERROR", "Unexpected server error");
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
  }
}

