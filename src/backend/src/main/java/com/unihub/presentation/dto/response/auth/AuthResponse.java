package com.unihub.presentation.dto.response.auth;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    long expiresIn,
    UserResponse user
) {
}

