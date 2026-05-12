package com.unihub.application.checkin;

public enum CheckinErrorCode {
  CHECKIN_INVALID_QR("CHECKIN_INVALID_QR", "QR token is malformed"),
  CHECKIN_QR_NOT_FOUND("CHECKIN_QR_NOT_FOUND", "QR ticket was not found"),
  CHECKIN_QR_REVOKED("CHECKIN_QR_REVOKED", "QR ticket has been revoked"),
  CHECKIN_QR_EXPIRED("CHECKIN_QR_EXPIRED", "QR ticket has expired"),
  CHECKIN_REGISTRATION_NOT_FOUND("CHECKIN_REGISTRATION_NOT_FOUND", "Registration was not found"),
  CHECKIN_REGISTRATION_NOT_CONFIRMED("CHECKIN_REGISTRATION_NOT_CONFIRMED", "Registration is not confirmed"),
  CHECKIN_SESSION_MISMATCH("CHECKIN_SESSION_MISMATCH", "QR ticket belongs to another session"),
  CHECKIN_SESSION_NOT_OPEN("CHECKIN_SESSION_NOT_OPEN", "Session is not open for check-in"),
  CHECKIN_DUPLICATE("CHECKIN_DUPLICATE", "Registration is already checked in"),
  CHECKIN_EVENT_ALREADY_SYNCED("CHECKIN_EVENT_ALREADY_SYNCED", "Sync event was already processed"),
  CHECKIN_RECORD_FAILED("CHECKIN_RECORD_FAILED", "Failed to record check-in");

  private final String code;
  private final String defaultMessage;

  CheckinErrorCode(String code, String defaultMessage) {
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
