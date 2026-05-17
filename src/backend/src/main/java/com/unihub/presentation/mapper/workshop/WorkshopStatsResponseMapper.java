package com.unihub.presentation.mapper.workshop;

import com.unihub.application.workshop.WorkshopSessionStatsResult;
import com.unihub.application.workshop.WorkshopStatsResult;
import com.unihub.presentation.dto.response.workshop.WorkshopSessionStatsResponse;
import com.unihub.presentation.dto.response.workshop.WorkshopStatsResponse;
import org.springframework.stereotype.Component;

@Component
public class WorkshopStatsResponseMapper {
  public WorkshopStatsResponse toResponse(WorkshopStatsResult result) {
    return new WorkshopStatsResponse(
        result.workshopId(),
        result.title(),
        result.totalCapacity(),
        result.confirmedCount(),
        result.reservedCount(),
        result.checkedInCount(),
        result.remainingSeats(),
        result.sessions().stream().map(this::toSessionResponse).toList());
  }

  private WorkshopSessionStatsResponse toSessionResponse(WorkshopSessionStatsResult result) {
    return new WorkshopSessionStatsResponse(
        result.sessionId(),
        result.roomName(),
        result.building(),
        result.startAt(),
        result.endAt(),
        result.capacity(),
        result.confirmedCount(),
        result.reservedCount(),
        result.checkedInCount(),
        result.remainingSeats(),
        result.status());
  }
}
