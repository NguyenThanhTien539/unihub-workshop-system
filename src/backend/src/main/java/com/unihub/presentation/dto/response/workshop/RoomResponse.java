package com.unihub.presentation.dto.response.workshop;

import java.util.UUID;

public record RoomResponse(
    UUID id,
    String name,
    String building,
    int capacity,
    String mapUrl,
    String status) {
}
