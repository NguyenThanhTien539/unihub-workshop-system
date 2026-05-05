package com.unihub.domain.workshop;

public enum WorkshopErrorCode {
  WORKSHOP_NOT_FOUND("WORKSHOP_NOT_FOUND", "Workshop not found"),
  WORKSHOP_SESSION_NOT_FOUND("WORKSHOP_SESSION_NOT_FOUND", "Workshop session not found"),
  WORKSHOP_ROOM_NOT_FOUND("WORKSHOP_ROOM_NOT_FOUND", "Room not found"),
  WORKSHOP_VALIDATION_ERROR("WORKSHOP_VALIDATION_ERROR", "Workshop validation error"),
  WORKSHOP_INVALID_TIME_RANGE("WORKSHOP_INVALID_TIME_RANGE", "End time must be after start time"),
  WORKSHOP_ROOM_CONFLICT("WORKSHOP_ROOM_CONFLICT", "Room schedule conflicts with existing session"),
  WORKSHOP_INVALID_CAPACITY("WORKSHOP_INVALID_CAPACITY", "Seat capacity must be greater than zero"),
  WORKSHOP_ROOM_CAPACITY_EXCEEDED("WORKSHOP_ROOM_CAPACITY_EXCEEDED", "Seat capacity exceeds room capacity"),
  WORKSHOP_FEE_REQUIRED("WORKSHOP_FEE_REQUIRED", "Paid session must have a positive fee"),
  WORKSHOP_FEE_NOT_ALLOWED("WORKSHOP_FEE_NOT_ALLOWED", "Free session cannot have a fee"),
  WORKSHOP_CAPACITY_BELOW_CONFIRMED("WORKSHOP_CAPACITY_BELOW_CONFIRMED",
      "Capacity cannot be below confirmed or reserved seats");

  private final String code;
  private final String defaultMessage;

  WorkshopErrorCode(String code, String defaultMessage) {
    this.code = code;
    this.defaultMessage = defaultMessage;
  }

  public String code() {
    return code;
  }

  public String defaultMessage() {
    return defaultMessage;
  }
}
