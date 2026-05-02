package com.unihub.application.auth.model;

public record TokenPair(
    String accessToken,
    String refreshToken,
    long expiresIn
) {
}

