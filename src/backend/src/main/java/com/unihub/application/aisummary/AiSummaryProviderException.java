package com.unihub.application.aisummary;

import com.unihub.domain.aisummary.AiSummaryErrorCode;

public class AiSummaryProviderException extends RuntimeException {
  private final AiSummaryErrorCode errorCode;

  public AiSummaryProviderException(AiSummaryErrorCode errorCode) {
    this(errorCode, errorCode.defaultMessage());
  }

  public AiSummaryProviderException(AiSummaryErrorCode errorCode, String message) {
    super(message);
    this.errorCode = errorCode;
  }

  public AiSummaryErrorCode getErrorCode() {
    return errorCode;
  }
}
