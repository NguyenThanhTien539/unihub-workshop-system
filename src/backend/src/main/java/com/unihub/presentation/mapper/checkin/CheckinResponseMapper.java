package com.unihub.presentation.mapper.checkin;

import com.unihub.application.checkin.CheckinSessionResult;
import com.unihub.application.checkin.CheckinSyncEventCommand;
import com.unihub.application.checkin.CheckinSyncItemResult;
import com.unihub.application.checkin.CheckinSyncResult;
import com.unihub.application.checkin.CheckinValidationResult;
import com.unihub.application.checkin.SyncCheckinCommand;
import com.unihub.application.checkin.ValidateCheckinCommand;
import com.unihub.presentation.dto.request.checkin.CheckinSyncEventRequest;
import com.unihub.presentation.dto.request.checkin.CheckinSyncRequest;
import com.unihub.presentation.dto.request.checkin.CheckinValidateRequest;
import com.unihub.presentation.dto.response.checkin.CheckinSessionResponse;
import com.unihub.presentation.dto.response.checkin.CheckinSyncItemResponse;
import com.unihub.presentation.dto.response.checkin.CheckinSyncResponse;
import com.unihub.presentation.dto.response.checkin.CheckinValidateResponse;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class CheckinResponseMapper {
  public ValidateCheckinCommand toValidateCommand(CheckinValidateRequest request) {
    return new ValidateCheckinCommand(request.sessionId(), request.qrToken(), request.scannedAt());
  }

  public SyncCheckinCommand toSyncCommand(CheckinSyncRequest request) {
    return new SyncCheckinCommand(request.events().stream().map(this::toSyncEventCommand).toList());
  }

  public CheckinSessionResponse toSessionResponse(CheckinSessionResult result) {
    return new CheckinSessionResponse(
        result.sessionId(),
        result.workshopTitle(),
        result.roomName(),
        result.building(),
        result.startAt(),
        result.endAt(),
        result.checkinOpen());
  }

  public CheckinValidateResponse toValidateResponse(CheckinValidationResult result) {
    return new CheckinValidateResponse(
        result.result().name(),
        result.registrationId(),
        result.studentName(),
        result.studentId(),
        result.checkedInAt(),
        result.previousCheckedInAt());
  }

  public CheckinSyncResponse toSyncResponse(CheckinSyncResult result) {
    List<CheckinSyncItemResponse> responses = result.results().stream()
        .map(this::toSyncItemResponse)
        .toList();
    return new CheckinSyncResponse(responses);
  }

  private CheckinSyncEventCommand toSyncEventCommand(CheckinSyncEventRequest request) {
    return new CheckinSyncEventCommand(
        request.syncEventId(),
        request.sessionId(),
        request.qrToken(),
        request.scannedAt(),
        request.deviceId());
  }

  private CheckinSyncItemResponse toSyncItemResponse(CheckinSyncItemResult result) {
    return new CheckinSyncItemResponse(
        result.syncEventId(),
        result.result().name(),
        result.registrationId(),
        result.studentId(),
        result.checkedInAt(),
        result.errorCode());
  }
}
