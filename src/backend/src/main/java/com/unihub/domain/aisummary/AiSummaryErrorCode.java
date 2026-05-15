package com.unihub.domain.aisummary;

public enum AiSummaryErrorCode {
  AI_WORKSHOP_NOT_FOUND("Workshop not found"),
  AI_DOCUMENT_NOT_FOUND("Document not found"),
  AI_FILE_REQUIRED("PDF file is required"),
  AI_FILE_TYPE_INVALID("Only PDF files are supported"),
  AI_FILE_TOO_LARGE("PDF file is too large"),
  AI_STORAGE_UNAVAILABLE("Object storage is unavailable"),
  AI_PDF_INVALID("PDF cannot be read"),
  AI_TEXT_EMPTY("PDF does not contain extractable text"),
  AI_API_KEY_MISSING("Gemini API key is missing"),
  AI_PROVIDER_TIMEOUT("AI provider timed out"),
  AI_PROVIDER_UNAVAILABLE("AI provider is unavailable"),
  AI_OUTPUT_INVALID("AI provider returned an empty or invalid summary"),
  AI_SUMMARY_FAILED("AI summary generation failed"),
  AI_SUMMARY_PROCESSING("AI summary is still processing");

  private final String defaultMessage;

  AiSummaryErrorCode(String defaultMessage) {
    this.defaultMessage = defaultMessage;
  }

  public String code() {
    return name();
  }

  public String defaultMessage() {
    return defaultMessage;
  }
}
