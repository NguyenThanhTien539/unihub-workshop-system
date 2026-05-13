import { apiClient, unwrapApiResponse } from "./apiClient";
import {
  ApiEnvelope,
  CheckinSession,
  SyncOfflineEventsRequest,
  SyncOfflineEventsResponse,
  ValidateQrRequest,
  ValidateQrResponse,
} from "./types";

export async function getCheckinSessions(): Promise<CheckinSession[]> {
  const response = await apiClient.get<ApiEnvelope<CheckinSession[]>>("/api/checkin/sessions");
  return unwrapApiResponse(response.data).map((session) => ({
    ...session,
    source: "LIVE",
  }));
}

export async function validateQr(request: ValidateQrRequest): Promise<ValidateQrResponse> {
  const response = await apiClient.post<ApiEnvelope<ValidateQrResponse>>(
    "/api/checkin/validate",
    request,
  );
  return unwrapApiResponse(response.data);
}

export async function syncOfflineEvents(
  request: SyncOfflineEventsRequest,
): Promise<SyncOfflineEventsResponse> {
  const response = await apiClient.post<ApiEnvelope<SyncOfflineEventsResponse>>(
    "/api/checkin/sync",
    request,
  );
  return unwrapApiResponse(response.data);
}
