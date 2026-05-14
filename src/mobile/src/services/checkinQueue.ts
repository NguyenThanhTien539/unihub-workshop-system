import type { CheckinSyncEventPayload, CheckinSyncItemResponse } from "./checkinApi";

export type OfflineCheckinStatus = "PENDING_SYNC" | "SYNCING" | "SYNCED" | "FAILED" | "CONFLICT";

export type OfflineCheckinEvent = CheckinSyncEventPayload & {
  localStatus: OfflineCheckinStatus;
  createdAt: string;
  backendResult?: CheckinSyncItemResponse["result"];
  backendErrorCode?: string | null;
};

let queue: OfflineCheckinEvent[] = [];

// This adapter is in-memory today so the UI can be wired immediately.
// Replacing it with AsyncStorage/SQLite later will not require screen changes.
export async function listQueuedEvents() {
  return [...queue].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export async function enqueueOfflineEvent(event: OfflineCheckinEvent) {
  queue = [event, ...queue];
  return event;
}

export async function updateOfflineEvent(
  syncEventId: string,
  patch: Partial<OfflineCheckinEvent>,
) {
  queue = queue.map((event) =>
    event.syncEventId === syncEventId
      ? {
          ...event,
          ...patch,
        }
      : event,
  );
}

export async function getPendingOfflineEvents() {
  return queue.filter((event) => event.localStatus === "PENDING_SYNC" || event.localStatus === "FAILED");
}
