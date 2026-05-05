import { CheckinHistoryItem, CheckinResult, OfflineQueueItem } from "../models/types";
import { apiRequest } from "./apiClient";

export async function verifyCheckin(): Promise<CheckinResult> {
  await apiRequest<string>("/api/checkin/auth-test");
  throw new Error("Check-in verification is not available from the current backend API.");
}

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  await apiRequest<string>("/api/checkin/auth-test");
  return [];
}

export async function syncOfflineQueue(): Promise<OfflineQueueItem[]> {
  await apiRequest<string>("/api/checkin/auth-test");
  return [];
}

export async function getCheckinHistory(): Promise<CheckinHistoryItem[]> {
  await apiRequest<string>("/api/checkin/auth-test");
  return [];
}
