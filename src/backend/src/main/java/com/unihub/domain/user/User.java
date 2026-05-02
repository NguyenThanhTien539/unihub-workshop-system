package com.unihub.domain.user;

import java.util.UUID;

public record User(
    UUID id,
    String email,
    String passwordHash,
    String fullName,
    UserStatus accountStatus
) {
  public User {
    email = email == null ? null : email.toLowerCase().trim();
  }
}

