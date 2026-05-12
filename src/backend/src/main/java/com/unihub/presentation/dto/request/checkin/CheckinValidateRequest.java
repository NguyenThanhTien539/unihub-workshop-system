package com.unihub.presentation.dto.request.checkin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.UUID;

public record CheckinValidateRequest(
    @NotNull UUID sessionId,
    @NotBlank String qrToken,
    @NotNull LocalDateTime scannedAt) {
}
