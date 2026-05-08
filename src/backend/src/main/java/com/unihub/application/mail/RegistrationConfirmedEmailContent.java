package com.unihub.application.mail;

public record RegistrationConfirmedEmailContent(
    String to,
    String subject,
    String body,
    String qrFileName,
    byte[] qrPngBytes) {
}
