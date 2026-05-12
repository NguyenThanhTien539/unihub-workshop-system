package com.unihub.domain.payment;

public enum PaymentErrorCode {
  PAYMENT_NOT_FOUND("PAYMENT_NOT_FOUND", "Payment intent not found"),
  PAYMENT_ACCESS_DENIED("PAYMENT_ACCESS_DENIED", "You do not have access to this payment intent"),
  PAYMENT_INVALID_STATE("PAYMENT_INVALID_REGISTRATION_STATE", "Payment intent is not in a payable state"),
  PAYMENT_EXPIRED("PAYMENT_EXPIRED", "Payment intent is expired"),
  PAYMENT_INVALID_SIGNATURE("PAYMENT_INVALID_SIGNATURE", "Payment callback signature is invalid"),
  PAYMENT_GATEWAY_REF_NOT_FOUND("PAYMENT_GATEWAY_REF_NOT_FOUND", "Payment gateway reference was not found"),
  PAYMENT_AMOUNT_MISMATCH("PAYMENT_AMOUNT_MISMATCH", "Payment amount does not match local intent"),
  PAYMENT_CURRENCY_MISMATCH("PAYMENT_CURRENCY_MISMATCH", "Payment currency does not match local intent"),
  PAYMENT_PROVIDER_DISABLED("PAYMENT_PROVIDER_DISABLED", "Payment provider is disabled"),
  PAYMENT_PROVIDER_ERROR("PAYMENT_PROVIDER_ERROR", "Failed to create payment with provider");

  private final String code;
  private final String defaultMessage;

  PaymentErrorCode(String code, String defaultMessage) {
    this.code = code;
    this.defaultMessage = defaultMessage;
  }

  public String code() {
    return code;
  }

  public String defaultMessage() {
    return defaultMessage;
  }
}
