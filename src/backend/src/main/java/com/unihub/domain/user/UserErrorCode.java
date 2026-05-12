package com.unihub.domain.user;

public enum UserErrorCode {
  AUTH_INVALID_CREDENTIALS("AUTH_INVALID_CREDENTIALS", "Invalid email or password"),
  AUTH_VALIDATION_ERROR("AUTH_VALIDATION_ERROR", "Authentication request is invalid"),
  AUTH_EMAIL_NOT_FOUND("AUTH_EMAIL_NOT_FOUND", "Email does not exist"),
  AUTH_PASSWORD_INCORRECT("AUTH_PASSWORD_INCORRECT", "Password is incorrect"),
  AUTH_ACCOUNT_DISABLED("AUTH_ACCOUNT_DISABLED", "Account is disabled"),
  AUTH_ACCOUNT_LOCKED("AUTH_ACCOUNT_LOCKED", "Account is locked"),
  AUTH_TOKEN_MISSING("AUTH_TOKEN_MISSING", "Access token is required"),
  AUTH_TOKEN_INVALID("AUTH_TOKEN_INVALID", "Access token is invalid"),
  AUTH_TOKEN_EXPIRED("AUTH_TOKEN_EXPIRED", "Access token is expired"),
  AUTH_REFRESH_TOKEN_MISSING("AUTH_REFRESH_TOKEN_MISSING", "Refresh token is required"),
  AUTH_REFRESH_TOKEN_INVALID("AUTH_REFRESH_TOKEN_INVALID", "Refresh token is invalid"),
  AUTH_REFRESH_TOKEN_EXPIRED("AUTH_REFRESH_TOKEN_EXPIRED", "Refresh token is expired"),
  AUTH_REFRESH_TOKEN_REVOKED("AUTH_REFRESH_TOKEN_REVOKED", "Refresh token is revoked"),
  AUTH_FORBIDDEN("AUTH_FORBIDDEN", "Access denied");

  private final String code;
  private final String defaultMessage;

  UserErrorCode(String code, String defaultMessage) {
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

