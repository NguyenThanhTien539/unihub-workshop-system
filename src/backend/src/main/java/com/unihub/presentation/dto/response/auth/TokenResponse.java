package com.unihub.presentation.dto.response.auth;

public record TokenResponse(
    String accessToken,
    String refreshToken,
    long expiresIn
) {
}

