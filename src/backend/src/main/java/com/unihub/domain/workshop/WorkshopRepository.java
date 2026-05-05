package com.unihub.domain.workshop;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkshopRepository {
  Optional<Workshop> findById(UUID workshopId);

  List<WorkshopSessionView> findPublishedWorkshopSessions(
      String keyword,
      FeeType feeType,
      UUID roomId,
      LocalDateTime startAt,
      LocalDateTime endAt,
      Integer page,
      Integer size);

  Optional<WorkshopSession> findSessionById(UUID sessionId);

  List<WorkshopSessionView> findWorkshopSessions(UUID workshopId, boolean includeCanceled);

  List<WorkshopSession> findSessionsByWorkshopId(UUID workshopId);

  Workshop save(Workshop workshop);

  Workshop update(Workshop workshop);

  WorkshopSession saveSession(WorkshopSession session);

  WorkshopSession updateSession(WorkshopSession session);

  void updateWorkshopStatus(UUID workshopId, WorkshopStatus status, LocalDateTime publishedAt,
      LocalDateTime canceledAt);

  int cancelSessionsByWorkshopId(UUID workshopId, LocalDateTime canceledAt);

  boolean existsRoomConflict(UUID roomId, LocalDateTime startAt, LocalDateTime endAt, UUID excludeSessionId);
}
