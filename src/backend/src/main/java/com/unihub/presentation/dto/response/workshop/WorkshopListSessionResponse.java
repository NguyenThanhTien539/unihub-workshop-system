package com.unihub.presentation.dto.response.workshop;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record WorkshopListSessionResponse(
    UUID id,
    String roomName,
    String building,
    LocalDateTime startAt,
    LocalDateTime endAt,
    String status,
    int remainingSeats,
    String feeType,
    BigDecimal feeAmount,
    String currency) {
}
