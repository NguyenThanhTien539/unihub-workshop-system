package com.unihub.application.workshop;

import java.time.LocalDateTime;
import java.util.UUID;

public record WorkshopSessionStatsResult(
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
