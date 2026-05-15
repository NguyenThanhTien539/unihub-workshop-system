package com.unihub.application.aisummary;

import com.unihub.domain.aisummary.AiSummaryErrorCode;
import org.springframework.http.HttpStatus;

public class AiSummaryException extends RuntimeException {
  private final AiSummaryErrorCode errorCode;
  private final HttpStatus status;

  public AiSummaryException(AiSummaryErrorCode errorCode, HttpStatus status) {
    this(errorCode, status, errorCode.defaultMessage());
  }

  public AiSummaryException(AiSummaryErrorCode errorCode, HttpStatus status, String message) {
    super(message);
    this.errorCode = errorCode;
    this.status = status;
  }

  public AiSummaryErrorCode getErrorCode() {
    return errorCode;
  }

  public HttpStatus getStatus() {
    return status;
  }
}
