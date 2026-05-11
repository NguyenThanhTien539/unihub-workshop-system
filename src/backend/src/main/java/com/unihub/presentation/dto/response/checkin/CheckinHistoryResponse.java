package com.unihub.presentation.dto.response.checkin;

import java.time.LocalDateTime;
import java.util.UUID;

public record CheckinHistoryResponse(
    UUID id,
    String studentName,
    String studentId,
    String workshopTitle,
    LocalDateTime checkedInAt,
    String status
) {
}
