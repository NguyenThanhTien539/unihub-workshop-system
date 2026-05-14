package com.unihub.application.csvimport;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.unihub.domain.csvimport.CsvImportErrorCode;
import com.unihub.domain.student.StudentStatus;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class CsvStudentRosterParserTest {
  private final CsvStudentRosterParser parser = new CsvStudentRosterParser();

  @Test
  void parsesStudentCodeAliasAndDefaultsMissingStatusToActive() {
    String csv = """
        student_code,full_name,email,faculty,major,class_name,status
        s001,Alice Nguyen,alice@example.edu,Engineering,Software,SE-01,
        S002,Bob Tran,bob@example.edu,Business,Marketing,BA-02,graduated
        """;

    CsvStudentRosterParser.ParseResult result = parser.parse(csv.getBytes(StandardCharsets.UTF_8));

    assertFalse(result.hasFailure());
    assertEquals(2, result.rows().size());
    assertEquals(2, result.rows().get(0).rowNumber());
    assertEquals("s001", result.rows().get(0).studentCode());
    assertEquals(StudentStatus.ACTIVE, result.rows().get(0).status());
    assertEquals(StudentStatus.GRADUATED, result.rows().get(1).status());
  }

  @Test
  void reportsMissingRequiredStudentColumn() {
    String csv = """
        full_name,email
        Alice Nguyen,alice@example.edu
        """;

    CsvStudentRosterParser.ParseResult result = parser.parse(csv.getBytes(StandardCharsets.UTF_8));

    assertTrue(result.hasFailure());
    assertEquals(CsvImportErrorCode.CSV_IMPORT_REQUIRED_COLUMN_MISSING, result.failure().errorCode());
    assertEquals("CSV file must contain student_id or student_code column", result.failure().message());
  }

  @Test
  void keepsInvalidStatusAsRowLevelValidationConcern() {
    String csv = """
        student_id,full_name,status
        S001,Alice Nguyen,paused
        """;

    CsvStudentRosterParser.ParseResult result = parser.parse(csv.getBytes(StandardCharsets.UTF_8));

    assertFalse(result.hasFailure());
    assertEquals(1, result.rows().size());
    assertNull(result.rows().get(0).status());
  }

  @Test
  void rejectsInvalidUtf8Input() {
    byte[] invalidUtf8 = new byte[] {
        's', 't', 'u', 'd', 'e', 'n', 't', '_', 'i', 'd', ',', 'f', 'u', 'l', 'l', '_', 'n', 'a', 'm', 'e', '\n',
        'S', '0', '0', '1', ',', (byte) 0xC3, (byte) 0x28
    };

    CsvStudentRosterParser.ParseResult result = parser.parse(invalidUtf8);

    assertTrue(result.hasFailure());
    assertEquals(CsvImportErrorCode.CSV_IMPORT_INVALID_ENCODING, result.failure().errorCode());
  }
}
