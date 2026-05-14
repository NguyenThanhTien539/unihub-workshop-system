package com.unihub.domain.csvimport;

import com.unihub.domain.student.StudentStatus;

public record StudentRosterRow(
    int rowNumber,
    String studentCode,
    String fullName,
    String email,
    String faculty,
    String major,
    String className,
    StudentStatus status) {
}
