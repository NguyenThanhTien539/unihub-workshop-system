package com.unihub.domain.registration;

public enum RegistrationErrorCode {
  STUDENT_PROFILE_NOT_FOUND("STUDENT_PROFILE_NOT_FOUND", "Student profile was not found"),
  WORKSHOP_SESSION_NOT_FOUND("WORKSHOP_SESSION_NOT_FOUND", "Workshop session was not found"),
  WORKSHOP_NOT_AVAILABLE("WORKSHOP_NOT_AVAILABLE", "Workshop is not available for registration"),
  WORKSHOP_SESSION_NOT_OPEN("WORKSHOP_SESSION_NOT_OPEN", "Workshop session is not open for registration"),
  WORKSHOP_SESSION_FULL("WORKSHOP_SESSION_FULL", "Workshop session has no remaining seats");

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
