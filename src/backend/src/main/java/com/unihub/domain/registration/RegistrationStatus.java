package com.unihub.domain.registration;

public enum RegistrationStatus {
  PENDING_PAYMENT,
  CONFIRMED,
  PAYMENT_FAILED,
  EXPIRED,
  CANCELED;

  public boolean isActive() {
    return this == PENDING_PAYMENT || this == CONFIRMED;
  }

  public boolean isConfirmed() {
    return this == CONFIRMED;
  }
}
