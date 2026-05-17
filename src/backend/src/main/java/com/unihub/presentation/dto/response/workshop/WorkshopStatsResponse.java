package com.unihub.presentation.dto.response.workshop;

import java.util.List;
import java.util.UUID;

public record WorkshopStatsResponse(
    UUID workshopId,
    String title,
    int totalCapacity,
    int confirmedCount,
    int reservedCount,
    int checkedInCount,
    int remainingSeats,
    List<WorkshopSessionStatsResponse> sessions) {
}
