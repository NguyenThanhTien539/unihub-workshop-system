package com.unihub.presentation.dto.response.registration;

import java.util.UUID;

public record RegistrationResponse(
    UUID id,
    UUID workshopId,
    String workshopTitle,
    String status,
    String qrToken,
    String message,
    String notification
) {
}
