package com.unihub.presentation.dto.request.auth;

import jakarta.validation.constraints.NotBlank;

public record RefreshTokenRequest(
    @NotBlank String refreshToken
) {
}

