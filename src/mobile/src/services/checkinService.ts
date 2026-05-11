import { CheckinHistoryItem, CheckinResult, OfflineQueueItem } from "../models/types";
import { apiRequest } from "./apiClient";

export async function verifyCheckin(qrToken: string): Promise<CheckinResult> {
  if (!qrToken.trim()) {
    throw new Error("Enter a QR token before verifying check-in.");
  }
  // The backend currently stores only QR token hashes and has no verify endpoint.
  await apiRequest<string>("/api/checkin/auth-test");
  throw new Error("Check-in verification is not available from the current backend API.");
}

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  // Offline queue persistence/sync endpoints are not defined in the backend yet.
  await apiRequest<string>("/api/checkin/auth-test");
  return [];
}

export async function syncOfflineQueue(): Promise<OfflineQueueItem[]> {
  // Offline queue persistence/sync endpoints are not defined in the backend yet.
  await apiRequest<string>("/api/checkin/auth-test");
  return [];
}

export async function getCheckinHistory(): Promise<CheckinHistoryItem[]> {
  return apiRequest<CheckinHistoryItem[]>("/api/checkin/history");
}
