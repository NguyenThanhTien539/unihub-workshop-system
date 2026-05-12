package com.unihub.presentation.mapper.admin;

import com.unihub.application.workshop.CreateSessionCommand;
import com.unihub.application.workshop.CreateWorkshopCommand;
import com.unihub.application.workshop.UpdateSessionCommand;
import com.unihub.application.workshop.UpdateWorkshopCommand;
import com.unihub.presentation.dto.request.workshop.CreateWorkshopRequest;
import com.unihub.presentation.dto.request.workshop.CreateWorkshopSessionRequest;
import com.unihub.presentation.dto.request.workshop.UpdateWorkshopRequest;
import com.unihub.presentation.dto.request.workshop.UpdateWorkshopSessionRequest;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class AdminWorkshopRequestMapper {
  public CreateWorkshopCommand toCreateWorkshopCommand(
      CreateWorkshopRequest request,
      UUID userId,
      List<CreateSessionCommand> sessions) {
    return new CreateWorkshopCommand(
        request.title(),
        request.speaker(),
        request.description(),
        userId,
        sessions);
  }

  public UpdateWorkshopCommand toUpdateWorkshopCommand(UUID workshopId, UpdateWorkshopRequest request) {
    return new UpdateWorkshopCommand(
        workshopId,
        request.title(),
        request.speaker(),
        request.description());
  }

  public CreateSessionCommand toCreateSessionCommand(UUID workshopId, CreateWorkshopSessionRequest request) {
    return new CreateSessionCommand(
        workshopId,
        request.roomId(),
        request.startAt(),
        request.endAt(),
        request.seatCapacity(),
        request.feeType(),
        request.feeAmount(),
        request.currency());
  }

  public UpdateSessionCommand toUpdateSessionCommand(UUID sessionId, UpdateWorkshopSessionRequest request) {
    return new UpdateSessionCommand(
        sessionId,
        request.roomId(),
        request.startAt(),
        request.endAt(),
        request.seatCapacity(),
        request.feeType(),
        request.feeAmount(),
        request.currency());
  }

  public List<CreateSessionCommand> toCreateSessionCommands(
      List<CreateWorkshopSessionRequest> requests,
      UUID workshopId) {
    if (requests == null || requests.isEmpty()) {
      return List.of();
    }

    List<CreateSessionCommand> sessions = new ArrayList<>();
    for (CreateWorkshopSessionRequest request : requests) {
      sessions.add(toCreateSessionCommand(workshopId, request));
    }

    return sessions;
  }
}
