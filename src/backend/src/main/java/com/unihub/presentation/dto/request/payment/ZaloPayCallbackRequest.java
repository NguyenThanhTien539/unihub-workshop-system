package com.unihub.presentation.dto.request.payment;

import jakarta.validation.constraints.NotBlank;

public record ZaloPayCallbackRequest(
    @NotBlank String data,
    @NotBlank String mac) {
}
