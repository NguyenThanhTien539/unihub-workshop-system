package com.unihub.application.checkin;

import org.springframework.http.HttpStatus;

public class CheckinException extends RuntimeException {
  private final CheckinErrorCode errorCode;
  private final HttpStatus status;

  public CheckinException(CheckinErrorCode errorCode, HttpStatus status) {
    this(errorCode, status, errorCode.defaultMessage());
  }

  public CheckinException(CheckinErrorCode errorCode, HttpStatus status, String message) {
    super(message);
    this.errorCode = errorCode;
    this.status = status;
  }

  public CheckinErrorCode getErrorCode() {
    return errorCode;
  }

  public HttpStatus getStatus() {
    return status;
  }
}
