package com.unihub.domain.qr;

public enum QrErrorCode {
  QR_NOT_FOUND("QR_NOT_FOUND", "QR ticket not found"),
  QR_NOT_AVAILABLE("REG_QR_NOT_AVAILABLE", "QR ticket is not available"),
  QR_ACCESS_DENIED("REG_ACCESS_DENIED", "You do not have access to this QR ticket");

  private final String code;
  private final String defaultMessage;

  QrErrorCode(String code, String defaultMessage) {
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
