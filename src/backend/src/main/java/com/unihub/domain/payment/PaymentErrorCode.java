package com.unihub.domain.payment;

public enum PaymentErrorCode {
  PAYMENT_INTENT_NOT_FOUND("PAYMENT_INTENT_NOT_FOUND", "Payment intent not found"),
  PAYMENT_INTENT_EXPIRED("PAYMENT_INTENT_EXPIRED", "Payment intent is expired"),
  PAYMENT_ALREADY_SUCCEEDED("PAYMENT_ALREADY_SUCCEEDED", "Payment intent is already confirmed"),
  PAYMENT_ALREADY_IN_PROGRESS("PAYMENT_ALREADY_IN_PROGRESS", "Payment is already in progress"),
  PAYMENT_GATEWAY_UNAVAILABLE(
      "PAYMENT_GATEWAY_UNAVAILABLE",
      "Cổng thanh toán hiện không khả dụng. Vui lòng thử lại sau."),
  PAYMENT_TIMEOUT(
      "PAYMENT_TIMEOUT",
      "Cổng thanh toán phản hồi quá lâu. Vui lòng thử lại sau."),
  PAYMENT_PROVIDER_UNAVAILABLE("PAYMENT_PROVIDER_UNAVAILABLE", "Cổng thanh toán hiện không khả dụng. Vui lòng thử lại sau."),
  PAYMENT_PROVIDER_REJECTED("PAYMENT_PROVIDER_REJECTED", "Payment provider rejected the request"),
  PAYMENT_CALLBACK_MAC_INVALID("PAYMENT_CALLBACK_MAC_INVALID", "Payment callback MAC is invalid"),
  PAYMENT_ACCESS_DENIED("PAYMENT_ACCESS_DENIED", "You do not have access to this payment intent"),
  PAYMENT_INVALID_STATE("PAYMENT_INVALID_STATE", "Payment intent is not in a payable state"),
  PAYMENT_AMOUNT_MISMATCH("PAYMENT_AMOUNT_MISMATCH", "Payment amount does not match local intent"),
  PAYMENT_CURRENCY_MISMATCH("PAYMENT_CURRENCY_MISMATCH", "Payment currency does not match local intent"),
  PAYMENT_REGISTRATION_NOT_FOUND("PAYMENT_REGISTRATION_NOT_FOUND", "Registration for this payment was not found"),
  PAYMENT_NOT_ALLOWED_FOR_FREE_SESSION(
      "PAYMENT_NOT_ALLOWED_FOR_FREE_SESSION",
      "This registration does not require payment"),
  PAYMENT_PROVIDER_DISABLED("PAYMENT_PROVIDER_DISABLED", "Cổng thanh toán hiện chưa sẵn sàng. Vui lòng thử lại sau."),
  PAYMENT_PROVIDER_ERROR("PAYMENT_PROVIDER_ERROR", "Không thể tạo yêu cầu thanh toán. Vui lòng thử lại sau.");

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
