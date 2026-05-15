package com.unihub.presentation.error;

import com.unihub.application.auth.exception.AuthException;
import com.unihub.application.aisummary.AiSummaryException;
import com.unihub.application.checkin.CheckinException;
import com.unihub.application.csvimport.CsvImportException;
import com.unihub.application.payment.exception.PaymentException;
import com.unihub.application.registration.exception.RegistrationException;
import com.unihub.application.workshop.exception.WorkshopException;
import com.unihub.domain.registration.RegistrationErrorCode;
import com.unihub.domain.workshop.WorkshopErrorCode;
import com.unihub.domain.user.UserErrorCode;
import com.unihub.presentation.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.stream.Collectors;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.CannotGetJdbcConnectionException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.TransactionTimedOutException;
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
    ApiResponse<Void> body = ApiResponse.error(mapping.code(), mapping.message());
    return ResponseEntity.status(mapping.status()).body(body);
  }

  @ExceptionHandler({
      CannotAcquireLockException.class,
      PessimisticLockingFailureException.class,
      QueryTimeoutException.class,
      TransactionTimedOutException.class
  })
  public ResponseEntity<ApiResponse<Void>> handleConcurrencyConflict(Exception ex) {
    ApiResponse<Void> body = ApiResponse.error(
        RegistrationErrorCode.REG_SESSION_FULL.code(),
        RegistrationErrorCode.REG_SESSION_FULL.defaultMessage());
    return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
  }

  @ExceptionHandler(CannotGetJdbcConnectionException.class)
  public ResponseEntity<ApiResponse<Void>> handleDatabaseUnavailable(CannotGetJdbcConnectionException ex) {
    ApiResponse<Void> body = ApiResponse.error(
        "REGISTRATION_TEMPORARILY_UNAVAILABLE",
        "Registration is temporarily unavailable");
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> handleFallback(Exception ex) {
    ApiResponse<Void> body = ApiResponse.error("INTERNAL_SERVER_ERROR", "Unexpected server error");
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
  }

  private ErrorMapping mapDataIntegrityError(String message) {
    if (message == null) {
      return new ErrorMapping(WorkshopErrorCode.WORKSHOP_VALIDATION_ERROR.code(), HttpStatus.BAD_REQUEST,
          "Data integrity violation");
    }

    String normalized = message.toLowerCase();
    if (normalized.contains("uq_active_registration_student_session")) {
      return new ErrorMapping(RegistrationErrorCode.REG_ALREADY_EXISTS.code(), HttpStatus.CONFLICT,
          RegistrationErrorCode.REG_ALREADY_EXISTS.defaultMessage());
    }
    if (normalized.contains("ck_workshop_sessions_total_seats")) {
      return new ErrorMapping(RegistrationErrorCode.REG_SESSION_FULL.code(), HttpStatus.CONFLICT,
          RegistrationErrorCode.REG_SESSION_FULL.defaultMessage());
    }
    if (normalized.contains("ex_workshop_sessions_room_overlap")) {
      return new ErrorMapping(WorkshopErrorCode.WORKSHOP_ROOM_CONFLICT.code(), HttpStatus.CONFLICT,
          WorkshopErrorCode.WORKSHOP_ROOM_CONFLICT.defaultMessage());
    }
    if (normalized.contains("ck_workshop_sessions_time_order")) {
      return new ErrorMapping(WorkshopErrorCode.WORKSHOP_INVALID_TIME_RANGE.code(), HttpStatus.BAD_REQUEST,
          WorkshopErrorCode.WORKSHOP_INVALID_TIME_RANGE.defaultMessage());
    }
    if (normalized.contains("ck_workshop_sessions_seat_capacity_positive")) {
      return new ErrorMapping(WorkshopErrorCode.WORKSHOP_INVALID_CAPACITY.code(), HttpStatus.BAD_REQUEST,
          WorkshopErrorCode.WORKSHOP_INVALID_CAPACITY.defaultMessage());
    }
    if (normalized.contains("ck_workshop_sessions_fee_rule")) {
      return new ErrorMapping(WorkshopErrorCode.WORKSHOP_VALIDATION_ERROR.code(), HttpStatus.BAD_REQUEST,
          "Invalid fee configuration");
    }
    if (normalized.contains("fk_workshop_sessions_room")) {
      return new ErrorMapping(WorkshopErrorCode.WORKSHOP_ROOM_NOT_FOUND.code(), HttpStatus.NOT_FOUND,
          WorkshopErrorCode.WORKSHOP_ROOM_NOT_FOUND.defaultMessage());
    }
    if (normalized.contains("fk_workshop_sessions_workshop")) {
      return new ErrorMapping(WorkshopErrorCode.WORKSHOP_NOT_FOUND.code(), HttpStatus.NOT_FOUND,
          WorkshopErrorCode.WORKSHOP_NOT_FOUND.defaultMessage());
    }

    return new ErrorMapping(WorkshopErrorCode.WORKSHOP_VALIDATION_ERROR.code(), HttpStatus.BAD_REQUEST,
        "Data integrity violation");
  }

  private record ErrorMapping(String code, HttpStatus status, String message) {
  }
}
