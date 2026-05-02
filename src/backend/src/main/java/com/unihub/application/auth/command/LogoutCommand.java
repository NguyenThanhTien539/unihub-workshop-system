package com.unihub.application.auth.command;

public record LogoutCommand(
    String refreshToken
) {
}

