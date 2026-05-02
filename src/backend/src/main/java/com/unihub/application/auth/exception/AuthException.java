package com.unihub.application.auth.exception;

import com.unihub.domain.user.UserErrorCode;
import org.springframework.http.HttpStatus;

public class AuthException extends RuntimeException {
  private final UserErrorCode errorCode;
  private final HttpStatus status;

  public AuthException(UserErrorCode errorCode, HttpStatus status) {
    super(errorCode.defaultMessage());
    this.errorCode = errorCode;
    this.status = status;
  }

  public UserErrorCode getErrorCode() {
    return errorCode;
  }

  public HttpStatus getStatus() {
    return status;
  }
}

