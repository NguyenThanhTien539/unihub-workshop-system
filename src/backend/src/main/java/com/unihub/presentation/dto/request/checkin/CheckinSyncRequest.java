package com.unihub.presentation.dto.request.checkin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record CheckinSyncRequest(@NotEmpty List<@Valid CheckinSyncEventRequest> events) {
}
