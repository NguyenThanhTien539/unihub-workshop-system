package com.unihub.application.payment;

public record ZaloPayCallbackResult(int return_code, String return_message) {
  public static ZaloPayCallbackResult success() {
    return new ZaloPayCallbackResult(1, "success");
  }
}
