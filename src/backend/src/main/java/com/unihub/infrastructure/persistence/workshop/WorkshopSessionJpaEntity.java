package com.unihub.infrastructure.persistence.workshop;

import com.unihub.domain.workshop.FeeType;
import com.unihub.domain.workshop.WorkshopSession;
import com.unihub.domain.workshop.WorkshopSessionStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record WorkshopSessionJpaEntity(
    UUID id,
    UUID workshopId,
    UUID roomId,
    LocalDateTime startAt,
    LocalDateTime endAt,
    String status,
    int seatCapacity,
    int seatsConfirmed,
    int seatsReserved,
    String feeType,
    BigDecimal feeAmount,
    String currency,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    LocalDateTime canceledAt) {
  WorkshopSession toDomain() {
    return new WorkshopSession(
        id,
        workshopId,
        roomId,
        startAt,
        endAt,
        WorkshopSessionStatus.valueOf(status),
        seatCapacity,
        seatsConfirmed,
        seatsReserved,
        FeeType.valueOf(feeType),
        feeAmount,
        currency,
        createdAt,
        updatedAt,
        canceledAt);
  }
}
