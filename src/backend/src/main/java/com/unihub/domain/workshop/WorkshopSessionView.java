package com.unihub.domain.workshop;

import com.unihub.domain.room.Room;

public record WorkshopSessionView(
    Workshop workshop,
    WorkshopSession session,
    Room room) {
}
