package com.unihub.application.workshop;

import com.unihub.domain.room.Room;
import com.unihub.domain.workshop.Workshop;
import com.unihub.domain.workshop.WorkshopSession;
import com.unihub.domain.workshop.WorkshopSessionView;
import com.unihub.presentation.dto.response.workshop.RoomResponse;
import com.unihub.presentation.dto.response.workshop.WorkshopDetailResponse;
import com.unihub.presentation.dto.response.workshop.WorkshopListResponse;
import com.unihub.presentation.dto.response.workshop.WorkshopListSessionResponse;
import com.unihub.presentation.dto.response.workshop.WorkshopSessionResponse;
import com.unihub.presentation.dto.response.workshop.WorkshopSummaryResponse;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class WorkshopMapper {
  public List<WorkshopSummaryResponse> toWorkshopSummaryResponses(List<WorkshopSessionView> views) {
    Map<UUID, WorkshopSummaryResponseBuilder> builders = new LinkedHashMap<>();
    for (WorkshopSessionView view : views) {
      Workshop workshop = view.workshop();
      WorkshopSummaryResponseBuilder builder = builders.computeIfAbsent(workshop.id(),
          id -> new WorkshopSummaryResponseBuilder(workshop, new ArrayList<>()));
      builder.sessions().add(toWorkshopSessionResponse(view));
    }

    List<WorkshopSummaryResponse> responses = new ArrayList<>();
    for (WorkshopSummaryResponseBuilder builder : builders.values()) {
      Workshop workshop = builder.workshop();
      responses.add(new WorkshopSummaryResponse(
          workshop.id(),
          workshop.title(),
          workshop.speaker(),
          workshop.description(),
          workshop.status().name(),
          builder.sessions()));
    }
    return responses;
  }

  public List<WorkshopListResponse> toWorkshopListResponses(List<WorkshopSessionView> views) {
    Map<UUID, WorkshopListResponseBuilder> builders = new LinkedHashMap<>();
    for (WorkshopSessionView view : views) {
      Workshop workshop = view.workshop();
      WorkshopListResponseBuilder builder = builders.computeIfAbsent(workshop.id(),
          id -> new WorkshopListResponseBuilder(workshop, new ArrayList<>()));
      builder.sessions().add(toWorkshopListSessionResponse(view));
    }

    List<WorkshopListResponse> responses = new ArrayList<>();
    for (WorkshopListResponseBuilder builder : builders.values()) {
      Workshop workshop = builder.workshop();
      responses.add(new WorkshopListResponse(
          workshop.id(),
          workshop.title(),
          workshop.speaker(),
          workshop.description(),
          workshop.status().name(),
          builder.sessions()));
    }
    return responses;
  }

  public WorkshopDetailResponse toWorkshopDetailResponse(Workshop workshop, List<WorkshopSessionView> views) {
    List<WorkshopSessionResponse> sessions = new ArrayList<>();
    for (WorkshopSessionView view : views) {
      sessions.add(toWorkshopSessionResponse(view));
    }

    return new WorkshopDetailResponse(
        workshop.id(),
        workshop.title(),
        workshop.speaker(),
        workshop.description(),
        workshop.status().name(),
        workshop.createdAt(),
        workshop.updatedAt(),
        workshop.publishedAt(),
        workshop.canceledAt(),
        sessions);
  }

  public WorkshopSessionResponse toWorkshopSessionResponse(WorkshopSessionView view) {
    return toWorkshopSessionResponse(view.session(), view.room());
  }

  public WorkshopListSessionResponse toWorkshopListSessionResponse(WorkshopSessionView view) {
    WorkshopSession session = view.session();
    Room room = view.room();
    return new WorkshopListSessionResponse(
        session.id(),
        room.name(),
        room.building(),
        session.startAt(),
        session.endAt(),
        session.status().name(),
        remainingSeats(session),
        session.feeType().name(),
        session.feeAmount(),
        session.currency());
  }

  public WorkshopSessionResponse toWorkshopSessionResponse(WorkshopSession session, Room room) {
    return new WorkshopSessionResponse(
        session.id(),
        room.id(),
        room.name(),
        room.building(),
        session.startAt(),
        session.endAt(),
        session.status().name(),
        session.seatCapacity(),
        session.seatsConfirmed(),
        session.seatsReserved(),
        remainingSeats(session),
        session.feeType().name(),
        session.feeAmount(),
        session.currency());
  }

  public RoomResponse toRoomResponse(Room room) {
    return new RoomResponse(
        room.id(),
        room.name(),
        room.building(),
        room.capacity(),
        room.mapUrl(),
        room.status().name());
  }

  public List<RoomResponse> toRoomResponses(List<Room> rooms) {
    List<RoomResponse> responses = new ArrayList<>();
    for (Room room : rooms) {
      responses.add(toRoomResponse(room));
    }
    return responses;
  }

  private int remainingSeats(WorkshopSession session) {
    int remaining = session.seatCapacity() - session.seatsConfirmed() - session.seatsReserved();
    return Math.max(remaining, 0);
  }

  private record WorkshopSummaryResponseBuilder(Workshop workshop, List<WorkshopSessionResponse> sessions) {
  }

  private record WorkshopListResponseBuilder(Workshop workshop, List<WorkshopListSessionResponse> sessions) {
  }
}
