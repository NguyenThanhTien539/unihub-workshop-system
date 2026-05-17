package com.unihub.application.notification;

import com.unihub.domain.notification.NotificationErrorCode;
import org.springframework.http.HttpStatus;

public class NotificationException extends RuntimeException {
  private final NotificationErrorCode errorCode;
  private final HttpStatus status;

  public NotificationException(NotificationErrorCode errorCode, HttpStatus status) {
    super(errorCode.defaultMessage());
    this.errorCode = errorCode;
    this.status = status;
  }

  public NotificationException(NotificationErrorCode errorCode, HttpStatus status, String message) {
    super(message);
    this.errorCode = errorCode;
    this.status = status;
  }

  public NotificationErrorCode getErrorCode() {
    return errorCode;
  }

  public HttpStatus getStatus() {
    return status;
  }
}
