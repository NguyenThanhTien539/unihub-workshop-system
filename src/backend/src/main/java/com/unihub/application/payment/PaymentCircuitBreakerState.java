package com.unihub.application.payment;

public enum PaymentCircuitBreakerState {
  CLOSED,
  OPEN,
  HALF_OPEN
}
