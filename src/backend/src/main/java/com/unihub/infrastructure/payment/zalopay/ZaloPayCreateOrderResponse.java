package com.unihub.infrastructure.payment.zalopay;

public record ZaloPayCreateOrderResponse(
    int returnCode,
    String returnMessage,
    String orderUrl) {
}
