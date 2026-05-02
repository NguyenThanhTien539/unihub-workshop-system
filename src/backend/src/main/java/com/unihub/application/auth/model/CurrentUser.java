package com.unihub.application.auth.model;

import java.util.List;
import java.util.UUID;

public record CurrentUser(
    UUID id,
    String email,
    String fullName,
    List<String> roles,
    StudentProfile studentProfile
) {
  public record StudentProfile(
      UUID studentId,
      String studentCode,
      String status
  ) {
  }
}

