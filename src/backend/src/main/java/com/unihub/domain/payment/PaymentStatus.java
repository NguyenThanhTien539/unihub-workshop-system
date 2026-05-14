package com.unihub.domain.payment;

public enum PaymentStatus {
  PENDING_GATEWAY,
  PENDING_PAYMENT,
  SUCCESS,
  FAILED,
  EXPIRED,
  CANCELED;

  public boolean isPending() {
    return this == PENDING_GATEWAY || this == PENDING_PAYMENT;
  }
}
