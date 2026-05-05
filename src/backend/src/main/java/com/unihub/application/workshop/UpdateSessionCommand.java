package com.unihub.application.workshop;

import com.unihub.domain.workshop.FeeType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record UpdateSessionCommand(
    UUID sessionId,
    UUID roomId,
    LocalDateTime startAt,
    LocalDateTime endAt,
    Integer seatCapacity,
    FeeType feeType,
    BigDecimal feeAmount,
    String currency) {
}
