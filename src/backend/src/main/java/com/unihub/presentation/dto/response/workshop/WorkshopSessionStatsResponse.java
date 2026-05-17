package com.unihub.presentation.dto.response.workshop;

import java.time.LocalDateTime;
import java.util.UUID;

public record WorkshopSessionStatsResponse(
    UUID sessionId,
    String roomName,
    String building,
    LocalDateTime startAt,
    LocalDateTime endAt,
    int capacity,
    int confirmedCount,
    int reservedCount,
    int checkedInCount,
    int remainingSeats,
    String status) {
}
