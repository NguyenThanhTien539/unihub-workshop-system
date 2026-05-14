package com.unihub.domain.student;

import java.util.UUID;

public record Student(
    UUID id,
    UUID userId,
    String studentCode,
    String faculty,
    String major,
    String className,
    StudentStatus status
) {
}

