package com.unihub.application.workshop;

import com.unihub.application.workshop.exception.WorkshopException;
import com.unihub.domain.room.Room;
import com.unihub.domain.room.RoomRepository;
import com.unihub.domain.workshop.FeeType;
import com.unihub.domain.workshop.Workshop;
import com.unihub.domain.workshop.WorkshopErrorCode;
import com.unihub.domain.workshop.WorkshopRepository;
import com.unihub.domain.workshop.WorkshopSession;
import com.unihub.domain.workshop.WorkshopSessionView;
import com.unihub.domain.workshop.WorkshopStatus;
import com.unihub.presentation.dto.response.workshop.RoomResponse;
import com.unihub.presentation.dto.response.workshop.WorkshopDetailResponse;
import com.unihub.presentation.dto.response.workshop.WorkshopListResponse;
import com.unihub.presentation.dto.response.workshop.WorkshopSessionResponse;
import com.unihub.presentation.dto.response.workshop.WorkshopSummaryResponse;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkshopQueryService {
  private final WorkshopRepository workshopRepository;
  private final RoomRepository roomRepository;
  private final WorkshopMapper workshopMapper;

  public WorkshopQueryService(
      WorkshopRepository workshopRepository,
      RoomRepository roomRepository,
      WorkshopMapper workshopMapper) {
    this.workshopRepository = workshopRepository;
    this.roomRepository = roomRepository;
    this.workshopMapper = workshopMapper;
  }

  @Transactional(readOnly = true)
  public List<WorkshopListResponse> listPublishedWorkshops(
      String keyword,
      FeeType feeType,
      UUID roomId,
      LocalDate date,
      Integer page,
      Integer size) {
    LocalDateTime startAt = date == null ? null : date.atStartOfDay();
    LocalDateTime endAt = date == null ? null : date.plusDays(1).atStartOfDay();

    List<WorkshopSessionView> views = workshopRepository.findPublishedWorkshopSessions(
        keyword,
        feeType,
        roomId,
        startAt,
        endAt,
        page,
        size);

    return workshopMapper.toWorkshopListResponses(views);
  }

  @Transactional(readOnly = true)
  public List<WorkshopDetailResponse> listAdminWorkshops(
      String keyword,
      WorkshopStatus status,
      Integer page,
      Integer size) {
    List<Workshop> workshops = workshopRepository.findWorkshops(keyword, status, page, size);
    return workshops.stream()
        .map(workshop -> {
          List<WorkshopSessionView> sessions = workshopRepository.findWorkshopSessions(workshop.id(), true);
          return workshopMapper.toWorkshopDetailResponse(workshop, sessions);
        })
        .toList();
  }

  @Transactional(readOnly = true)
  public WorkshopDetailResponse getPublishedWorkshopDetail(UUID workshopId) {
    Workshop workshop = workshopRepository.findById(workshopId)
        .orElseThrow(() -> new WorkshopException(WorkshopErrorCode.WORKSHOP_NOT_FOUND, HttpStatus.NOT_FOUND));

    if (workshop.status() != WorkshopStatus.PUBLISHED) {
      throw new WorkshopException(WorkshopErrorCode.WORKSHOP_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    List<WorkshopSessionView> sessions = workshopRepository.findWorkshopSessions(workshopId, false);
    return workshopMapper.toWorkshopDetailResponse(workshop, sessions);
  }

  @Transactional(readOnly = true)
  public WorkshopDetailResponse getAdminWorkshopDetail(UUID workshopId) {
    Workshop workshop = workshopRepository.findById(workshopId)
        .orElseThrow(() -> new WorkshopException(WorkshopErrorCode.WORKSHOP_NOT_FOUND, HttpStatus.NOT_FOUND));

    List<WorkshopSessionView> sessions = workshopRepository.findWorkshopSessions(workshopId, true);
    return workshopMapper.toWorkshopDetailResponse(workshop, sessions);
  }

  @Transactional(readOnly = true)
  public List<RoomResponse> listRooms(boolean includeInactive) {
    List<Room> rooms = roomRepository.findAll(includeInactive);
    return workshopMapper.toRoomResponses(rooms);
  }

  @Transactional(readOnly = true)
  public WorkshopSessionResponse getSessionResponse(UUID sessionId) {
    WorkshopSession session = workshopRepository.findSessionById(sessionId)
        .orElseThrow(() -> new WorkshopException(WorkshopErrorCode.WORKSHOP_SESSION_NOT_FOUND, HttpStatus.NOT_FOUND));

    Room room = roomRepository.findById(session.roomId())
        .orElseThrow(() -> new WorkshopException(WorkshopErrorCode.WORKSHOP_ROOM_NOT_FOUND, HttpStatus.NOT_FOUND));

    return workshopMapper.toWorkshopSessionResponse(session, room);
  }
}
