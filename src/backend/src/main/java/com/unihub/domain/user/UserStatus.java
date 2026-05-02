package com.unihub.domain.user;

public enum UserStatus {
  ACTIVE,
  DISABLED,
  LOCKED;

  public boolean canLogin() {
    return this == ACTIVE;
  }
}

