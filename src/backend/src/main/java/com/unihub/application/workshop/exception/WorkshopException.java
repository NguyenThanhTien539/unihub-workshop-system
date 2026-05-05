package com.unihub.application.workshop.exception;

import com.unihub.domain.workshop.WorkshopErrorCode;
import org.springframework.http.HttpStatus;

public class WorkshopException extends RuntimeException {
  private final WorkshopErrorCode errorCode;
  private final HttpStatus status;

  public WorkshopException(WorkshopErrorCode errorCode, HttpStatus status, String message) {
    super(message);
    this.errorCode = errorCode;
    this.status = status;
  }

  public WorkshopException(WorkshopErrorCode errorCode, HttpStatus status) {
    this(errorCode, status, errorCode.defaultMessage());
  }

  public WorkshopErrorCode getErrorCode() {
    return errorCode;
  }

  public HttpStatus getStatus() {
    return status;
  }
}
