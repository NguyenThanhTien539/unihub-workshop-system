package com.unihub.domain.room;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoomRepository {
  Optional<Room> findById(UUID roomId);

  List<Room> findAll(boolean includeInactive);
}
