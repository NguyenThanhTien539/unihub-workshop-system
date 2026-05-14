package com.unihub.presentation.dto.request.checkin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.UUID;

public record CheckinSyncEventRequest(
    @NotBlank String syncEventId,
    @NotNull UUID sessionId,
    @NotBlank String qrToken,
    @NotNull LocalDateTime scannedAt,
    @Size(max = 255) String deviceId) {
}
