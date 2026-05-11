package com.unihub.presentation.dto.response.checkin;

import java.time.LocalDateTime;
import java.util.UUID;

public record CheckinValidateResponse(
    String result,
    UUID registrationId,
    String studentName,
    String studentId,
    LocalDateTime checkedInAt,
    LocalDateTime previousCheckedInAt) {
}
