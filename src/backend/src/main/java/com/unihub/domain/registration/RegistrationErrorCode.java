package com.unihub.domain.registration;

public enum RegistrationErrorCode {
  REG_STUDENT_NOT_ELIGIBLE("REG_STUDENT_NOT_ELIGIBLE", "Student is not eligible to register"),
  REG_SESSION_NOT_FOUND("REG_SESSION_NOT_FOUND", "Workshop session not found"),
  REG_SESSION_NOT_REGISTERABLE("REG_SESSION_NOT_REGISTERABLE", "Workshop session is not open for registration"),
  REG_SESSION_CANCELED("REG_SESSION_CANCELED", "Workshop session is canceled"),
  REG_SESSION_FULL("REG_SESSION_FULL", "Workshop session is full"),
  REG_ALREADY_EXISTS("REG_ALREADY_EXISTS", "Registration already exists"),
  REG_PAYMENT_REQUIRED("REG_PAYMENT_REQUIRED", "This session requires payment"),
  REG_PAYMENT_NOT_REQUIRED("REG_PAYMENT_NOT_REQUIRED", "This session does not require payment"),
  REG_NOT_FOUND("REG_NOT_FOUND", "Registration not found"),
  REG_ACCESS_DENIED("REG_ACCESS_DENIED", "You do not have access to this registration"),
  REG_QR_NOT_AVAILABLE("REG_QR_NOT_AVAILABLE", "QR ticket is not available for this registration");

  private final String code;
  private final String defaultMessage;

  RegistrationErrorCode(String code, String defaultMessage) {
    this.code = code;
    this.defaultMessage = defaultMessage;
  }

  public String code() {
    return code;
  }

  public String defaultMessage() {
    return defaultMessage;
  }
}
