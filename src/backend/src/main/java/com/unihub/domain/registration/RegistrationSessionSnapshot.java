package com.unihub.domain.registration;

import com.unihub.domain.workshop.FeeType;
import com.unihub.domain.workshop.WorkshopSessionStatus;
import com.unihub.domain.workshop.WorkshopStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record RegistrationSessionSnapshot(
    UUID workshopId,
    String workshopTitle,
    WorkshopStatus workshopStatus,
    UUID sessionId,
    WorkshopSessionStatus sessionStatus,
    UUID roomId,
    String roomName,
    String building,
    LocalDateTime startAt,
    LocalDateTime endAt,
    int seatCapacity,
    int seatsConfirmed,
    int seatsReserved,
    FeeType feeType,
    BigDecimal feeAmount,
    String currency) {

  public int remainingSeats() {
    return Math.max(seatCapacity - seatsConfirmed - seatsReserved, 0);
  }
}
