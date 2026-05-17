package com.unihub.application.workshop;

import java.util.List;
import java.util.UUID;

public record WorkshopStatsResult(
    UUID workshopId,
    String title,
    int totalCapacity,
    int confirmedCount,
    int reservedCount,
    int checkedInCount,
    int remainingSeats,
    List<WorkshopSessionStatsResult> sessions) {
}
