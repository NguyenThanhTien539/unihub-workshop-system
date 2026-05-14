package com.unihub.application.csvimport;

import com.unihub.domain.csvimport.CsvImportErrorCode;
import org.springframework.http.HttpStatus;

public class CsvImportException extends RuntimeException {
  private final CsvImportErrorCode errorCode;
  private final HttpStatus status;

  public CsvImportException(CsvImportErrorCode errorCode, HttpStatus status) {
    this(errorCode, status, errorCode.defaultMessage());
  }

  public CsvImportException(CsvImportErrorCode errorCode, HttpStatus status, String message) {
    super(message);
    this.errorCode = errorCode;
    this.status = status;
  }

  public CsvImportErrorCode getErrorCode() {
    return errorCode;
  }

  public HttpStatus getStatus() {
    return status;
  }
}
