package com.unihub.presentation.dto.response.qr;

import java.time.LocalDateTime;
import java.util.UUID;

public record RegistrationQrResponse(
        UUID registrationId,
        UUID qrTicketId,
        String dataUrl,
        LocalDateTime expiresAt,
        String status) {
}
