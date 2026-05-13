export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: {
    code?: string;
    message?: string;
  } | null;
};

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  accountStatus?: string;
  roles: string[];
  studentProfile?: unknown;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: CurrentUser;
};

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type CheckinSession = {
  sessionId: string;
  workshopTitle: string;
  roomName?: string | null;
  startAt: string;
  endAt: string;
  checkinOpen: boolean;
  cachedAt?: string;
  source?: "LIVE" | "CACHE" | "MOCK";
};

export type ValidateQrRequest = {
  sessionId: string;
  qrToken: string;
  scannedAt: string;
};

export type CheckinResult =
  | "ACCEPTED"
  | "DUPLICATE"
  | "REJECTED"
  | "ALREADY_SYNCED"
  | "PENDING_SYNC";

export type ValidateQrResponse = {
  result: CheckinResult;
  registrationId?: string;
  studentName?: string;
  studentId?: string;
  studentCode?: string;
  checkedInAt?: string;
  previousCheckedInAt?: string;
  message?: string;
  errorCode?: string;
};

export type OfflineCheckinLocalStatus =
  | "PENDING_SYNC"
  | "SYNCING"
  | "SYNCED"
  | "REJECTED"
  | "DUPLICATE"
  | "SYNC_FAILED";

export type OfflineCheckinEvent = {
  syncEventId: string;
  sessionId: string;
  qrToken: string;
  scannedAt: string;
  deviceId?: string | null;
  localStatus: OfflineCheckinLocalStatus;
  serverResult?: CheckinResult | null;
  syncedAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  retryCount: number;
  lastAttemptAt?: string | null;
  createdAt: string;
};

export type SyncOfflineEventPayload = {
  syncEventId: string;
  sessionId: string;
  qrToken: string;
  scannedAt: string;
  deviceId?: string | null;
};

export type SyncResult = ValidateQrResponse & {
  syncEventId: string;
};

export type SyncOfflineEventsRequest = {
  events: SyncOfflineEventPayload[];
};

export type SyncOfflineEventsResponse = {
  results: SyncResult[];
};

export type ScanHistoryEntry = {
  id: string;
  sessionId: string;
  qrTokenPreview?: string | null;
  result: CheckinResult | "SYNCED" | "SYNC_FAILED";
  sourceMode: "ONLINE" | "OFFLINE" | "SYNC";
  studentName?: string | null;
  studentCode?: string | null;
  registrationId?: string | null;
  message?: string | null;
  scannedAt: string;
  createdAt: string;
};
