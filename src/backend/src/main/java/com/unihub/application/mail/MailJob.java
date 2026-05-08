package com.unihub.application.mail;

import java.util.UUID;

public record MailJob(
    UUID notificationId,
    UUID registrationId,
    UUID recipientUserId,
    String recipientEmail,
    String eventId,
    MailJobType type) {
}
