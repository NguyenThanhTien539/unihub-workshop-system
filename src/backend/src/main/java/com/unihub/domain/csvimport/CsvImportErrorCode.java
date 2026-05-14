package com.unihub.domain.csvimport;

public enum CsvImportErrorCode {
  CSV_IMPORT_BATCH_NOT_FOUND("CSV_IMPORT_BATCH_NOT_FOUND", "CSV import batch not found"),
  CSV_IMPORT_FILE_UNREADABLE("CSV_IMPORT_FILE_UNREADABLE", "CSV file is unreadable"),
  CSV_IMPORT_INVALID_ENCODING("CSV_IMPORT_INVALID_ENCODING", "CSV file must be valid UTF-8"),
  CSV_IMPORT_INVALID_HEADER("CSV_IMPORT_INVALID_HEADER", "CSV header is invalid"),
  CSV_IMPORT_REQUIRED_COLUMN_MISSING("CSV_IMPORT_REQUIRED_COLUMN_MISSING", "CSV file is missing a required column"),
  CSV_IMPORT_ROW_INVALID("CSV_IMPORT_ROW_INVALID", "CSV row is invalid"),
  CSV_IMPORT_REQUIRED_FIELD_MISSING("CSV_IMPORT_REQUIRED_FIELD_MISSING", "Required field is missing"),
  CSV_IMPORT_INVALID_EMAIL("CSV_IMPORT_INVALID_EMAIL", "Email format is invalid"),
  CSV_IMPORT_INVALID_STATUS("CSV_IMPORT_INVALID_STATUS", "Student status is invalid"),
  CSV_IMPORT_FIELD_TOO_LONG("CSV_IMPORT_FIELD_TOO_LONG", "Field value is too long"),
  CSV_IMPORT_DUPLICATE_ROWS("CSV_IMPORT_DUPLICATE_ROWS", "Duplicate student rows were found"),
  CSV_IMPORT_PARTIAL("CSV_IMPORT_PARTIAL", "CSV import completed with row-level errors"),
  CSV_IMPORT_ALREADY_PROCESSED("CSV_IMPORT_ALREADY_PROCESSED", "CSV file checksum was already processed"),
  CSV_IMPORT_FAILED("CSV_IMPORT_FAILED", "CSV import failed"),
  CSV_IMPORT_MISSED("CSV_IMPORT_MISSED", "No CSV file was found for the scheduled import"),
  CSV_REQUIRED_FIELD_MISSING("CSV_REQUIRED_FIELD_MISSING", "Required field is missing"),
  CSV_INVALID_EMAIL("CSV_INVALID_EMAIL", "Email format is invalid"),
  CSV_INVALID_STATUS("CSV_INVALID_STATUS", "Student status is invalid"),
  CSV_DUPLICATE_STUDENT_ID("CSV_DUPLICATE_STUDENT_ID", "Duplicate student_id was found");

  private final String code;
  private final String defaultMessage;

  CsvImportErrorCode(String code, String defaultMessage) {
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
