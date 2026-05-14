package com.unihub.application.checkin;

import java.util.List;

public record SyncCheckinCommand(List<CheckinSyncEventCommand> events) {
}
