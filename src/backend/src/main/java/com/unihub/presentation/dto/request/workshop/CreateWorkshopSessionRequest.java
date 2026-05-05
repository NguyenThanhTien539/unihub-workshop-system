package com.unihub.presentation.dto.request.workshop;

import com.unihub.domain.workshop.FeeType;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record CreateWorkshopSessionRequest(
    @NotNull UUID roomId,
    @NotNull LocalDateTime startAt,
    @NotNull LocalDateTime endAt,
    @NotNull Integer seatCapacity,
    @NotNull FeeType feeType,
    BigDecimal feeAmount,
    String currency) {
}
