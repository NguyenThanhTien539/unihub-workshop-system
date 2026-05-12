package com.unihub.application.payment.exception;

import com.unihub.domain.payment.PaymentErrorCode;
import org.springframework.http.HttpStatus;

public class PaymentException extends RuntimeException {
  private final PaymentErrorCode errorCode;
  private final HttpStatus status;

  public PaymentException(PaymentErrorCode errorCode, HttpStatus status) {
    this(errorCode, status, errorCode.defaultMessage());
  }

  public PaymentException(PaymentErrorCode errorCode, HttpStatus status, String message) {
    super(message);
    this.errorCode = errorCode;
    this.status = status;
  }

  public PaymentErrorCode getErrorCode() {
    return errorCode;
  }

  public HttpStatus getStatus() {
    return status;
  }
}
