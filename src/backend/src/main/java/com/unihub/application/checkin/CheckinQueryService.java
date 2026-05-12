package com.unihub.application.checkin;

import com.unihub.domain.workshop.WorkshopRepository;
import com.unihub.domain.workshop.WorkshopSession;
import com.unihub.domain.workshop.WorkshopSessionStatus;
import com.unihub.domain.workshop.WorkshopSessionView;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CheckinQueryService {
  private final WorkshopRepository workshopRepository;
  private final Clock clock;

  public CheckinQueryService(WorkshopRepository workshopRepository, Clock clock) {
    this.workshopRepository = workshopRepository;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<CheckinSessionResult> getSessions() {
    LocalDateTime now = LocalDateTime.now(clock);
    return workshopRepository.findPublishedWorkshopSessions(null, null, null, null, null, null, null).stream()
        .sorted(Comparator.comparing(view -> view.session().startAt()))
        .map(view -> toSessionResult(view, now))
        .toList();
  }

  private CheckinSessionResult toSessionResult(WorkshopSessionView view, LocalDateTime now) {
    WorkshopSession session = view.session();
    return new CheckinSessionResult(
        session.id(),
        view.workshop().title(),
        view.room().name(),
        view.room().building(),
        session.startAt(),
        session.endAt(),
        isCheckinOpen(session.status(), session.startAt(), session.endAt(), now));
  }

  private boolean isCheckinOpen(
      WorkshopSessionStatus status,
      LocalDateTime startAt,
      LocalDateTime endAt,
      LocalDateTime eventTime) {
    boolean allowedStatus = status == WorkshopSessionStatus.OPEN || status == WorkshopSessionStatus.FULL;
    return allowedStatus && !eventTime.isBefore(startAt) && !eventTime.isAfter(endAt);
  }
}
