package com.unihub.presentation.dto.response.checkin;

import java.util.List;

public record CheckinSyncResponse(List<CheckinSyncItemResponse> results) {
}
