package com.unihub.application.aisummary;

public class ObjectStorageException extends RuntimeException {
  private final boolean retryable;

  public ObjectStorageException(String message, Throwable cause) {
    this(message, cause, true);
  }

  public ObjectStorageException(String message, Throwable cause, boolean retryable) {
    super(message, cause);
    this.retryable = retryable;
  }

  public boolean isRetryable() {
    return retryable;
  }
}
