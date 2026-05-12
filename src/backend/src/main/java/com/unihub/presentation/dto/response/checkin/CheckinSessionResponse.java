package com.unihub.presentation.dto.response.checkin;

import java.time.LocalDateTime;
import java.util.UUID;

public record CheckinSessionResponse(
    UUID sessionId,
    String workshopTitle,
    String roomName,
    String building,
    LocalDateTime startAt,
    LocalDateTime endAt,
    boolean checkinOpen) {
}
