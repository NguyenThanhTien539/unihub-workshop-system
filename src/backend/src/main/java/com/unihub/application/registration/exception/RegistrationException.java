package com.unihub.application.registration.exception;

import com.unihub.domain.registration.RegistrationErrorCode;
import org.springframework.http.HttpStatus;

public class RegistrationException extends RuntimeException {
  private final RegistrationErrorCode errorCode;
  private final HttpStatus status;

  public RegistrationException(RegistrationErrorCode errorCode, HttpStatus status) {
    super(errorCode.defaultMessage());
    this.errorCode = errorCode;
    this.status = status;
  }

  public RegistrationErrorCode getErrorCode() {
    return errorCode;
  }

  public HttpStatus getStatus() {
    return status;
  }
}
