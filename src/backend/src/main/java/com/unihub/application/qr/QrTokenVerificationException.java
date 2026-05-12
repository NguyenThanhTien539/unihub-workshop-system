package com.unihub.application.qr;

public class QrTokenVerificationException extends RuntimeException {
  public QrTokenVerificationException(String message) {
    super(message);
  }

  public QrTokenVerificationException(String message, Throwable cause) {
    super(message, cause);
  }
}
