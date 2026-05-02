package com.unihub.application.auth.model;

public record LoginResult(
    TokenPair token,
    CurrentUser user
) {
}
