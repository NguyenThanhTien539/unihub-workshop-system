package com.unihub.domain.room;

import java.time.LocalDateTime;
import java.util.UUID;

public record Room(
    UUID id,
    String name,
    String building,
    int capacity,
    String mapUrl,
    RoomStatus status,
    LocalDateTime createdAt,
    LocalDateTime updatedAt) {
}
