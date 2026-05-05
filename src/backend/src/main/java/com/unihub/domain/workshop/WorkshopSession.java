package com.unihub.domain.workshop;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record WorkshopSession(
    UUID id,
    UUID workshopId,
    UUID roomId,
    LocalDateTime startAt,
    LocalDateTime endAt,
    WorkshopSessionStatus status,
    int seatCapacity,
    int seatsConfirmed,
    int seatsReserved,
    FeeType feeType,
    BigDecimal feeAmount,
    String currency,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    LocalDateTime canceledAt) {
}
