package com.unihub.application.csvimport;

import com.unihub.domain.csvimport.CsvImportErrorCode;
import com.unihub.domain.csvimport.StudentRosterRow;
import com.unihub.domain.student.StudentStatus;
import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Component;

@Component
public class CsvStudentRosterParser {
  private static final List<String> STUDENT_CODE_HEADERS = List.of("student_id", "student_code");
  private static final String FULL_NAME_HEADER = "full_name";
  private static final String EMAIL_HEADER = "email";
  private static final String FACULTY_HEADER = "faculty";
  private static final String MAJOR_HEADER = "major";
  private static final String CLASS_NAME_HEADER = "class_name";
  private static final String STATUS_HEADER = "status";

  public ParseResult parse(byte[] bytes) {
    try (Reader reader = utf8Reader(bytes);
        CSVParser parser = CSVFormat.DEFAULT.builder()
            .setHeader()
            .setSkipHeaderRecord(true)
            .setIgnoreEmptyLines(true)
            .setIgnoreSurroundingSpaces(true)
            .setTrim(true)
            .setAllowMissingColumnNames(false)
            .build()
            .parse(reader)) {
      Map<String, String> headers = normalizeHeaders(parser.getHeaderMap());
      HeaderSelection selection = validateHeaders(headers);
      if (selection.failure() != null) {
        return ParseResult.failure(selection.failure());
      }

      List<StudentRosterRow> rows = new ArrayList<>();
      for (CSVRecord record : parser) {
        int rowNumber = Math.toIntExact(record.getRecordNumber() + 1);
        rows.add(new StudentRosterRow(
            rowNumber,
            safeGet(record, selection.studentCodeHeader()),
            safeGet(record, selection.fullNameHeader()),
            safeGet(record, headers.get(EMAIL_HEADER)),
            safeGet(record, headers.get(FACULTY_HEADER)),
            safeGet(record, headers.get(MAJOR_HEADER)),
            safeGet(record, headers.get(CLASS_NAME_HEADER)),
            parseStatus(safeGet(record, headers.get(STATUS_HEADER)))));
      }

      return ParseResult.success(rows);
    } catch (java.nio.charset.MalformedInputException
        | java.nio.charset.UnmappableCharacterException ex) {
      return ParseResult.failure(new ParseFailure(
          CsvImportErrorCode.CSV_IMPORT_INVALID_ENCODING,
          CsvImportErrorCode.CSV_IMPORT_INVALID_ENCODING.defaultMessage()));
    } catch (IllegalArgumentException ex) {
      return ParseResult.failure(new ParseFailure(
          CsvImportErrorCode.CSV_IMPORT_INVALID_HEADER,
          ex.getMessage() == null ? CsvImportErrorCode.CSV_IMPORT_INVALID_HEADER.defaultMessage() : ex.getMessage()));
    } catch (Exception ex) {
      return ParseResult.failure(new ParseFailure(
          CsvImportErrorCode.CSV_IMPORT_FILE_UNREADABLE,
          ex.getMessage() == null ? CsvImportErrorCode.CSV_IMPORT_FILE_UNREADABLE.defaultMessage() : ex.getMessage()));
    }
  }

  private Reader utf8Reader(byte[] bytes) {
    var decoder = StandardCharsets.UTF_8.newDecoder()
        .onMalformedInput(CodingErrorAction.REPORT)
        .onUnmappableCharacter(CodingErrorAction.REPORT);
    return new InputStreamReader(new ByteArrayInputStream(bytes), decoder);
  }

  private Map<String, String> normalizeHeaders(Map<String, Integer> headerMap) {
    Map<String, String> normalized = new LinkedHashMap<>();
    for (String rawHeader : headerMap.keySet()) {
      String cleanHeader = normalizeHeader(rawHeader);
      if (cleanHeader.isBlank()) {
        throw new IllegalArgumentException("CSV header contains a blank column name");
      }
      if (normalized.containsKey(cleanHeader)) {
        throw new IllegalArgumentException("CSV header contains duplicate column: " + cleanHeader);
      }
      normalized.put(cleanHeader, rawHeader);
    }
    return normalized;
  }

  private HeaderSelection validateHeaders(Map<String, String> headers) {
    String studentCodeHeader = null;
    for (String candidate : STUDENT_CODE_HEADERS) {
      if (headers.containsKey(candidate)) {
        studentCodeHeader = headers.get(candidate);
        break;
      }
    }
    if (studentCodeHeader == null) {
      return HeaderSelection.failed(new ParseFailure(
          CsvImportErrorCode.CSV_IMPORT_REQUIRED_COLUMN_MISSING,
          "CSV file must contain student_id or student_code column"));
    }

    String fullNameHeader = headers.get(FULL_NAME_HEADER);
    if (fullNameHeader == null) {
      return HeaderSelection.failed(new ParseFailure(
          CsvImportErrorCode.CSV_IMPORT_REQUIRED_COLUMN_MISSING,
          "CSV file must contain full_name column"));
    }

    return new HeaderSelection(studentCodeHeader, fullNameHeader, null);
  }

  private String normalizeHeader(String header) {
    if (header == null) {
      return "";
    }
    String value = header.strip();
    if (!value.isEmpty() && value.charAt(0) == '\uFEFF') {
      value = value.substring(1);
    }
    return value.toLowerCase(Locale.ROOT);
  }

  private String safeGet(CSVRecord record, String header) {
    if (header == null) {
      return null;
    }
    if (!record.isMapped(header) || !record.isSet(header)) {
      return null;
    }
    String value = record.get(header);
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private StudentStatus parseStatus(String rawStatus) {
    if (rawStatus == null || rawStatus.isBlank()) {
      return StudentStatus.ACTIVE;
    }
    try {
      return StudentStatus.valueOf(rawStatus.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      return null;
    }
  }

  public record ParseResult(
      List<StudentRosterRow> rows,
      ParseFailure failure) {
    public static ParseResult success(List<StudentRosterRow> rows) {
      return new ParseResult(List.copyOf(rows), null);
    }

    public static ParseResult failure(ParseFailure failure) {
      return new ParseResult(List.of(), failure);
    }

    public boolean hasFailure() {
      return failure != null;
    }
  }

  public record ParseFailure(
      CsvImportErrorCode errorCode,
      String message) {
  }

  private record HeaderSelection(
      String studentCodeHeader,
      String fullNameHeader,
      ParseFailure failure) {
    private static HeaderSelection failed(ParseFailure failure) {
      return new HeaderSelection(null, null, failure);
    }
  }
}
