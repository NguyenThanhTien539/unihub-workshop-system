package com.unihub.domain.student;

import java.util.UUID;

public record Student(
    UUID id,
    UUID userId,
    String studentCode,
    StudentStatus status
) {
}

