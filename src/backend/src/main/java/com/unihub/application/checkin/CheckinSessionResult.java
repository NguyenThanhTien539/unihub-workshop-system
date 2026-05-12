package com.unihub.application.checkin;

import java.time.LocalDateTime;
import java.util.UUID;

public record CheckinSessionResult(
    UUID sessionId,
    String workshopTitle,
    String roomName,
    String building,
    LocalDateTime startAt,
    LocalDateTime endAt,
    boolean checkinOpen) {
}
