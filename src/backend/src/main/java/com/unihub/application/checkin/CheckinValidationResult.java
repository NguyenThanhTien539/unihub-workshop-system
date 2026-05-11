package com.unihub.application.checkin;

import com.unihub.domain.checkin.CheckinResult;
import java.time.LocalDateTime;
import java.util.UUID;

public record CheckinValidationResult(
    CheckinResult result,
    UUID registrationId,
    String studentName,
    String studentId,
    LocalDateTime checkedInAt,
    LocalDateTime previousCheckedInAt) {
}
