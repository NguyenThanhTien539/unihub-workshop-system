package com.unihub.presentation.dto.request.workshop;

import com.unihub.domain.workshop.FeeType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record UpdateWorkshopSessionRequest(
    UUID roomId,
    LocalDateTime startAt,
    LocalDateTime endAt,
    Integer seatCapacity,
    FeeType feeType,
    BigDecimal feeAmount,
    String currency) {
}
