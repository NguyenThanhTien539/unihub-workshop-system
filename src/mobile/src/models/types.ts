export type Role = "STUDENT" | "CHECKIN_STAFF" | "ORGANIZER";

export type FeeType = "FREE" | "PAID";

export type WorkshopStatus = "DRAFT" | "PUBLISHED" | "FULL" | "CANCELLED";

export type WorkshopScheduleSession = {
  date: string;
  startTime: string;
  endTime: string;
};

export type Workshop = {
  id: string;
  sessionId?: string;
  roomId?: string;
  title: string;
  speaker: string;
  speakerTitle: string;
  speakerBio: string;
  time: string;
  startTime: string;
  endTime: string;
  date: string;
  scheduleSessions: WorkshopScheduleSession[];
  room: string;
  roomHint: string;
  roomMapUrl?: string | null;
  remainingSeats: number;
  capacity: number;
  feeType: FeeType;
  feeAmount: number;
  description: string;
  summary: string;
  tags: string[];
  status: WorkshopStatus;
};

export type Registration = {
  id: string;
  workshopId: string;
  workshopTitle: string;
  status: "CONFIRMED" | "PENDING_PAYMENT" | "PAYMENT_FAILED" | "EXPIRED" | "CANCELED";
  qrToken?: string;
  message: string;
  notification: string;
};

export type CheckinResultKind =
  | "VALID"
  | "ALREADY_USED"
  | "INVALID"
  | "OFFLINE_SAVED";

export type CheckinResult = {
  kind: CheckinResultKind;
  title: string;
  detail: string;
  studentName?: string;
  studentId?: string;
};

export type OfflineQueueItem = {
  id: string;
  studentName: string;
  workshopTitle: string;
  scannedAt: string;
  status: "PENDING_SYNC" | "SYNCED" | "NEEDS_REVIEW";
};

export type Account = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  label: string;
  studentId?: string;
  accessToken?: string;
  refreshToken?: string;
};

export type CheckinHistoryItem = {
  id: string;
  studentName: string;
  studentId: string;
  workshopTitle: string;
  checkedInAt: string;
  status: "VALID" | "DUPLICATE" | "OFFLINE_SYNCED";
};

export type OrganizerStats = {
  totalWorkshops: number;
  totalRegistrations: number;
  checkedInCount: number;
  paidRegistrationCount: number;
  cancelledWorkshops: number;
};

export type ManagedWorkshop = Workshop & {
  registrations: number;
  checkedIn: number;
  revenue: number;
};

export type WorkshopFormValues = {
  title: string;
  speaker: string;
  speakerBio: string;
  date: string;
  startTime: string;
  endTime: string;
  roomId: string;
  room: string;
  capacity: string;
  feeType: FeeType;
  feeAmount: string;
  description: string;
  summary: string;
  status: "DRAFT" | "PUBLISHED";
  roomHint: string;
};

export type Room = {
  id: string;
  name: string;
  building: string;
  capacity: number;
  mapUrl?: string | null;
  status: "ACTIVE" | "INACTIVE" | string;
};
