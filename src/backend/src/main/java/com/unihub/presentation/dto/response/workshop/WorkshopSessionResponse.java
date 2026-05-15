package com.unihub.presentation.dto.response.workshop;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record WorkshopSessionResponse(
    UUID id,
    UUID roomId,
    String roomName,
    String building,
    String roomMapUrl,
    LocalDateTime startAt,
    LocalDateTime endAt,
    String status,
    int seatCapacity,
    int seatsConfirmed,
    int seatsReserved,
    int remainingSeats,
    String feeType,
    BigDecimal feeAmount,
    String currency) {
}
