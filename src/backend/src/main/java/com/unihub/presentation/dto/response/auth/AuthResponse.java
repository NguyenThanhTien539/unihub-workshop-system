package com.unihub.presentation.dto.response.auth;

import java.util.List;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    long expiresIn,
    List<String> roles
) {
}

