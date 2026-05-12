package com.unihub.application.payment;

public record ZaloPayCreateOrderResult(
    String provider,
    String paymentUrl,
    String gatewayRef) {
}
