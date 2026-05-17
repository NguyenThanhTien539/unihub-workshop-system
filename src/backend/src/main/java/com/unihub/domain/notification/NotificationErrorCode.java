package com.unihub.domain.notification;

public enum NotificationErrorCode {
  NOTIFY_ACCESS_DENIED("NOTIFY_ACCESS_DENIED", "You do not have access to this notification"),
  NOTIFY_NOT_FOUND("NOTIFY_NOT_FOUND", "Notification not found"),
  NOTIFY_PROVIDER_TIMEOUT("NOTIFY_PROVIDER_TIMEOUT", "Notification provider timed out"),
  NOTIFY_PROVIDER_UNAVAILABLE("NOTIFY_PROVIDER_UNAVAILABLE", "Notification provider is unavailable"),
  NOTIFY_INVALID_EMAIL("NOTIFY_INVALID_EMAIL", "Notification email address is invalid"),
  NOTIFY_IN_APP_FAILED("NOTIFY_IN_APP_FAILED", "Unable to create in-app notification"),
  NOTIFY_DUPLICATE("NOTIFY_DUPLICATE", "Notification already exists"),
  NOTIFY_TEMPLATE_MISSING("NOTIFY_TEMPLATE_MISSING", "Notification template is missing"),
  NOTIFY_TEMPLATE_RENDER_FAILED("NOTIFY_TEMPLATE_RENDER_FAILED", "Unable to render notification template");

  private final String code;
  private final String defaultMessage;

  NotificationErrorCode(String code, String defaultMessage) {
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
