package com.unihub.application.checkin;

import com.unihub.domain.checkin.CheckinResult;
import java.time.LocalDateTime;
import java.util.UUID;

public record CheckinSyncItemResult(
    String syncEventId,
    CheckinResult result,
    UUID registrationId,
    String studentId,
    LocalDateTime checkedInAt,
    String errorCode) {
}
