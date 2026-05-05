import {
  CheckinResult,
  OfflineQueueItem,
  Registration,
  Workshop,
} from "../models/types";
import {
  getOfflineQueue as getQueue,
  syncOfflineQueue as syncQueue,
  verifyCheckin as verifyTicket,
} from "./mockCheckinService";
import {
  getWorkshops as getWorkshopList,
  registerForWorkshop as registerWorkshop,
} from "./mockWorkshopService";

export async function getWorkshops(): Promise<Workshop[]> {
  return getWorkshopList();
}

export async function registerForWorkshop(
  workshop: Workshop,
  studentId: string,
): Promise<Registration> {
  return registerWorkshop(workshop, studentId);
}

export async function verifyCheckin(token: string): Promise<CheckinResult> {
  return verifyTicket(token);
}

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  return getQueue();
}

export async function syncOfflineQueue(
  queue: OfflineQueueItem[],
): Promise<OfflineQueueItem[]> {
  return syncQueue(queue);
}
