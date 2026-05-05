package com.unihub.infrastructure.persistence.room;

import com.unihub.domain.room.Room;
import com.unihub.domain.room.RoomStatus;
import java.time.LocalDateTime;
import java.util.UUID;

public record RoomJpaEntity(
    UUID id,
    String name,
    String building,
    int capacity,
    String mapUrl,
    String status,
    LocalDateTime createdAt,
    LocalDateTime updatedAt) {
  Room toDomain() {
    return new Room(
        id,
        name,
        building,
        capacity,
        mapUrl,
        RoomStatus.valueOf(status),
        createdAt,
        updatedAt);
  }
}
