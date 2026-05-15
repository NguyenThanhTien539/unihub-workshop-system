package com.unihub.presentation.dto.response.workshop;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record WorkshopListSessionResponse(
    UUID id,
    String roomName,
    String building,
    String roomMapUrl,
    LocalDateTime startAt,
    LocalDateTime endAt,
    String status,
    int seatCapacity,
    int remainingSeats,
    String feeType,
    BigDecimal feeAmount,
    String currency) {
}
