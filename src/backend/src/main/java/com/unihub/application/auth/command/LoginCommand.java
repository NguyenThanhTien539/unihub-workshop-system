package com.unihub.application.auth.command;

public record LoginCommand(
    String email,
    String password) {
}
