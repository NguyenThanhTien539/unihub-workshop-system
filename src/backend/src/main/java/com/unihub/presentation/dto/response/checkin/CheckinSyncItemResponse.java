package com.unihub.presentation.dto.response.checkin;

import java.time.LocalDateTime;
import java.util.UUID;

public record CheckinSyncItemResponse(
    String syncEventId,
    String result,
    UUID registrationId,
    String studentId,
    LocalDateTime checkedInAt,
    String errorCode) {
}
