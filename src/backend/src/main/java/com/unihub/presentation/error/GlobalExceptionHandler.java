package com.unihub.presentation.error;

import com.unihub.application.auth.exception.AuthException;
import com.unihub.application.aisummary.AiSummaryException;
import com.unihub.application.checkin.CheckinException;
import com.unihub.application.csvimport.CsvImportException;
import com.unihub.application.payment.exception.PaymentException;
import com.unihub.application.registration.exception.RegistrationException;
import com.unihub.application.workshop.exception.WorkshopException;
import com.unihub.domain.workshop.WorkshopErrorCode;
import com.unihub.domain.user.UserErrorCode;
import com.unihub.presentation.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(AuthException.class)
  public ResponseEntity<ApiResponse<Void>> handleAuthException(AuthException ex) {
    ApiResponse<Void> body = ApiResponse.error(ex.getErrorCode().code(), ex.getMessage());
    return ResponseEntity.status(ex.getStatus()).body(body);
  }

  @ExceptionHandler(WorkshopException.class)
  public ResponseEntity<ApiResponse<Void>> handleWorkshopException(WorkshopException ex) {
    ApiResponse<Void> body = ApiResponse.error(ex.getErrorCode().code(), ex.getMessage());
    return ResponseEntity.status(ex.getStatus()).body(body);
  }

  @ExceptionHandler(RegistrationException.class)
  public ResponseEntity<ApiResponse<Void>> handleRegistrationException(RegistrationException ex) {
    ApiResponse<Void> body = ApiResponse.error(ex.getErrorCode().code(), ex.getMessage());
    return ResponseEntity.status(ex.getStatus()).body(body);
  }

  @ExceptionHandler(PaymentException.class)
  public ResponseEntity<ApiResponse<Void>> handlePaymentException(PaymentException ex) {
    ApiResponse<Void> body = ApiResponse.error(ex.getErrorCode().code(), ex.getMessage());
    return ResponseEntity.status(ex.getStatus()).body(body);
  }

  @ExceptionHandler(CheckinException.class)
  public ResponseEntity<ApiResponse<Void>> handleCheckinException(CheckinException ex) {
    ApiResponse<Void> body = ApiResponse.error(ex.getErrorCode().code(), ex.getMessage());
    return ResponseEntity.status(ex.getStatus()).body(body);
  }

  @ExceptionHandler(CsvImportException.class)
  public ResponseEntity<ApiResponse<Void>> handleCsvImportException(CsvImportException ex) {
    ApiResponse<Void> body = ApiResponse.error(ex.getErrorCode().code(), ex.getMessage());
    return ResponseEntity.status(ex.getStatus()).body(body);
  }

  @ExceptionHandler(AiSummaryException.class)
  public ResponseEntity<ApiResponse<Void>> handleAiSummaryException(AiSummaryException ex) {
    ApiResponse<Void> body = ApiResponse.error(ex.getErrorCode().code(), ex.getMessage());
    return ResponseEntity.status(ex.getStatus()).body(body);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<Void>> handleValidationException(
      MethodArgumentNotValidException ex,
      HttpServletRequest request) {
    if (request.getRequestURI().equals("/api/auth/refresh")) {
      ApiResponse<Void> body = ApiResponse.error(
          UserErrorCode.AUTH_REFRESH_TOKEN_MISSING.code(),
          UserErrorCode.AUTH_REFRESH_TOKEN_MISSING.defaultMessage());
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    if (request.getRequestURI().startsWith("/api/auth/")) {
      ApiResponse<Void> body = ApiResponse.error(
          UserErrorCode.AUTH_VALIDATION_ERROR.code(),
          UserErrorCode.AUTH_VALIDATION_ERROR.defaultMessage());
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
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
        UserErrorCode.AUTH_FORBIDDEN.defaultMessage());
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
    String message = ex.getMostSpecificCause() == null ? "" : ex.getMostSpecificCause().getMessage();
    ErrorMapping mapping = mapDataIntegrityError(message);
    ApiResponse<Void> body = ApiResponse.error(mapping.code().code(), mapping.message());
    return ResponseEntity.status(mapping.status()).body(body);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> handleFallback(Exception ex) {
    log.error("Unhandled request error", ex);
    ApiResponse<Void> body = ApiResponse.error(
        "INTERNAL_SERVER_ERROR",
        "Không thể xử lý yêu cầu. Vui lòng thử lại sau.");
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
  }

  private ErrorMapping mapDataIntegrityError(String message) {
    if (message == null) {
      return new ErrorMapping(WorkshopErrorCode.WORKSHOP_VALIDATION_ERROR, HttpStatus.BAD_REQUEST,
          "Data integrity violation");
    }

    String normalized = message.toLowerCase();
    if (normalized.contains("ex_workshop_sessions_room_overlap")) {
      return new ErrorMapping(WorkshopErrorCode.WORKSHOP_ROOM_CONFLICT, HttpStatus.CONFLICT,
          WorkshopErrorCode.WORKSHOP_ROOM_CONFLICT.defaultMessage());
    }
    if (normalized.contains("ck_workshop_sessions_time_order")) {
      return new ErrorMapping(WorkshopErrorCode.WORKSHOP_INVALID_TIME_RANGE, HttpStatus.BAD_REQUEST,
          WorkshopErrorCode.WORKSHOP_INVALID_TIME_RANGE.defaultMessage());
    }
    if (normalized.contains("ck_workshop_sessions_seat_capacity_positive")) {
      return new ErrorMapping(WorkshopErrorCode.WORKSHOP_INVALID_CAPACITY, HttpStatus.BAD_REQUEST,
          WorkshopErrorCode.WORKSHOP_INVALID_CAPACITY.defaultMessage());
    }
    if (normalized.contains("ck_workshop_sessions_fee_rule")) {
      return new ErrorMapping(WorkshopErrorCode.WORKSHOP_VALIDATION_ERROR, HttpStatus.BAD_REQUEST,
          "Invalid fee configuration");
    }
    if (normalized.contains("fk_workshop_sessions_room")) {
      return new ErrorMapping(WorkshopErrorCode.WORKSHOP_ROOM_NOT_FOUND, HttpStatus.NOT_FOUND,
          WorkshopErrorCode.WORKSHOP_ROOM_NOT_FOUND.defaultMessage());
    }
    if (normalized.contains("fk_workshop_sessions_workshop")) {
      return new ErrorMapping(WorkshopErrorCode.WORKSHOP_NOT_FOUND, HttpStatus.NOT_FOUND,
          WorkshopErrorCode.WORKSHOP_NOT_FOUND.defaultMessage());
    }
    if (normalized.contains("ck_workshop_sessions_total_seats")) {
      return new ErrorMapping(WorkshopErrorCode.WORKSHOP_CAPACITY_BELOW_CONFIRMED, HttpStatus.CONFLICT,
          WorkshopErrorCode.WORKSHOP_CAPACITY_BELOW_CONFIRMED.defaultMessage());
    }

    return new ErrorMapping(WorkshopErrorCode.WORKSHOP_VALIDATION_ERROR, HttpStatus.BAD_REQUEST,
        "Data integrity violation");
  }

  private record ErrorMapping(WorkshopErrorCode code, HttpStatus status, String message) {
  }
}