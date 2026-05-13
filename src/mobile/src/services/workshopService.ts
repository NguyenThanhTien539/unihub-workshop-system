import {
  ManagedWorkshop,
  Registration,
  Room,
  Workshop,
  WorkshopFormValues,
  WorkshopStatus,
} from "../models/types";
import {
  formatDateInput,
  formatTimeInput,
  toLocalDateTime,
} from "../utils/dateTime";
import { apiRequest } from "./apiClient";

type BackendWorkshopListSession = {
  id: string;
  roomName: string;
  building: string;
  roomMapUrl?: string | null;
  startAt: string;
  endAt: string;
  status: string;
  seatCapacity?: number;
  remainingSeats: number;
  feeType: "FREE" | "PAID";
  feeAmount: number | null;
  currency: string | null;
};

type BackendWorkshopSession = BackendWorkshopListSession & {
  roomId: string;
  seatCapacity: number;
  seatsConfirmed: number;
  seatsReserved: number;
};

type BackendWorkshop = {
  id: string;
  title: string;
  speaker: string;
  description: string;
  status: string;
  sessions: BackendWorkshopSession[];
};

type BackendWorkshopListItem = Omit<BackendWorkshop, "sessions"> & {
  sessions: BackendWorkshopListSession[];
};

type CreateSessionBody = {
  roomId: string;
  startAt: string;
  endAt: string;
  seatCapacity: number;
  feeType: "FREE" | "PAID";
  feeAmount: number;
  currency: string;
};

type UpdateWorkshopBody = {
  title: string;
  speaker: string;
  description: string;
};

type UpdateSessionBody = Partial<CreateSessionBody>;

type BackendRegistration = {
  registrationId: string;
  workshopId: string;
  workshopTitle: string;
  sessionId: string;
  registrationStatus: Registration["status"] | string;
  registrationType: "FREE" | "PAID" | string;
  paymentStatus?: string | null;
  qrAvailable: boolean;
};

type BackendRegistrationMutation = {
  registrationId: string;
  workshopId: string;
  sessionId: string;
  registrationStatus: Registration["status"] | string;
  qrAvailable: boolean;
  paymentStatus?: string | null;
};

export async function getWorkshops(): Promise<Workshop[]> {
  const response = await apiRequest<BackendWorkshopListItem[]>("/api/workshops");
  return response.map(mapWorkshopListItem);
}

export async function getCurrentWeekWorkshops(): Promise<Workshop[]> {
  const response = await apiRequest<BackendWorkshopListItem[]>("/api/student/workshops/current-week");
  return response.map(mapWorkshopListItem);
}

export async function getWorkshopDetail(workshopId: string): Promise<Workshop> {
  const response = await apiRequest<BackendWorkshop>(`/api/workshops/${workshopId}`);
  return mapWorkshopDetail(response);
}

export async function getMyRegistrations(): Promise<Registration[]> {
  const response = await apiRequest<BackendRegistration[]>("/api/registrations/me");
  return response.map(mapRegistration);
}

export async function registerForWorkshop(
  sessionId: string,
  feeType: "FREE" | "PAID" = "FREE",
): Promise<Registration> {
  const response = await apiRequest<BackendRegistrationMutation>(
    `/api/registrations/${feeType === "PAID" ? "paid" : "free"}`,
    {
    method: "POST",
    body: { sessionId },
    },
  );
  return mapRegistrationMutation(response);
}

export async function getOrganizerDashboard() {
  const workshops = (await getAdminWorkshops()).map(toManagedWorkshop);
  return {
    stats: buildStats(workshops),
    workshops,
  };
}

export async function getAdminWorkshops(): Promise<Workshop[]> {
  const response = await apiRequest<BackendWorkshop[]>("/api/admin/workshops");
  return response.map(mapWorkshopDetail);
}

export async function getRooms(): Promise<Room[]> {
  return apiRequest<Room[]>("/api/admin/rooms", {
    query: { includeInactive: false },
  });
}

export async function createWorkshop(
  values: WorkshopFormValues,
): Promise<ManagedWorkshop> {
  const body = {
    title: values.title.trim(),
    speaker: values.speaker.trim(),
    description: values.description.trim(),
    sessions: [toCreateSessionBody(values)],
  };
  let created = await apiRequest<BackendWorkshop>("/api/admin/workshops", {
    method: "POST",
    body,
  });

  if (values.status === "PUBLISHED") {
    created = await apiRequest<BackendWorkshop>(
      `/api/admin/workshops/${created.id}/publish`,
      { method: "POST" },
    );
  }

  return toManagedWorkshop(mapWorkshopDetail(created));
}

export async function updateWorkshop(
  workshop: ManagedWorkshop,
  values: WorkshopFormValues,
): Promise<ManagedWorkshop> {
  if (!workshop.sessionId) {
    throw new Error("This workshop does not have a session to update.");
  }

  const workshopBody: UpdateWorkshopBody = {
    title: values.title.trim(),
    speaker: values.speaker.trim(),
    description: values.description.trim(),
  };

  await apiRequest<BackendWorkshop>(`/api/admin/workshops/${workshop.id}`, {
    method: "PATCH",
    body: workshopBody,
  });

  const sessionBody: UpdateSessionBody = toUpdateSessionBody(values);
  await apiRequest<BackendWorkshopSession>(`/api/admin/sessions/${workshop.sessionId}`, {
    method: "PATCH",
    body: sessionBody,
  });

  if (workshop.status === "DRAFT" && values.status === "PUBLISHED") {
    await apiRequest<BackendWorkshop>(
      `/api/admin/workshops/${workshop.id}/publish`,
      { method: "POST" },
    );
  }

  const updated = await apiRequest<BackendWorkshop>(
    `/api/admin/workshops/${workshop.id}`,
  );
  return toManagedWorkshop(mapWorkshopDetail(updated));
}

export async function cancelWorkshop(
  workshop: ManagedWorkshop,
): Promise<ManagedWorkshop> {
  const cancelled = await apiRequest<BackendWorkshop>(
    `/api/admin/workshops/${workshop.id}/cancel`,
    { method: "POST" },
  );
  return toManagedWorkshop(mapWorkshopDetail(cancelled));
}

function mapWorkshopListItem(item: BackendWorkshopListItem): Workshop {
  const session = item.sessions[0];
  const scheduleSessions = item.sessions.map((itemSession) => ({
    date: formatDateInput(itemSession.startAt),
    startTime: formatTimeInput(itemSession.startAt),
    endTime: formatTimeInput(itemSession.endAt),
  }));
  return {
    id: item.id,
    sessionId: session?.id,
    title: item.title,
    speaker: item.speaker,
    speakerTitle: "Workshop Speaker",
    speakerBio: item.speaker,
    date: formatDateInput(session?.startAt),
    startTime: formatTimeInput(session?.startAt),
    endTime: formatTimeInput(session?.endAt),
    time: `${formatTimeInput(session?.startAt)} - ${formatTimeInput(session?.endAt)}`,
    scheduleSessions,
    room: formatRoom(session?.roomName, session?.building),
    roomHint: session?.building || "",
    roomMapUrl: session?.roomMapUrl ?? null,
    remainingSeats: session?.remainingSeats ?? 0,
    capacity: session?.seatCapacity ?? session?.remainingSeats ?? 0,
    feeType: session?.feeType || "FREE",
    feeAmount: Number(session?.feeAmount || 0),
    description: item.description,
    summary: item.description,
    tags: [item.status, session?.feeType || "FREE"],
    status: normalizeStatus(item.status, session?.remainingSeats),
  };
}

function mapWorkshopDetail(item: BackendWorkshop): Workshop {
  const session = item.sessions[0];
  return {
    ...mapWorkshopListItem({ ...item, sessions: item.sessions }),
    roomId: session?.roomId,
    capacity: session?.seatCapacity ?? 0,
  };
}

function mapRegistration(item: BackendRegistration): Registration {
  const status = normalizeRegistrationStatus(item.registrationStatus);
  return {
    id: item.registrationId,
    workshopId: item.workshopId,
    workshopTitle: item.workshopTitle,
    status,
    message: registrationMessage(status, item.registrationType, item.paymentStatus),
    notification: item.qrAvailable
      ? "Your check-in ticket has been sent to your email."
      : "Your check-in ticket will be emailed after the registration is confirmed.",
  };
}

function mapRegistrationMutation(item: BackendRegistrationMutation): Registration {
  const status = normalizeRegistrationStatus(item.registrationStatus);
  return {
    id: item.registrationId,
    workshopId: item.workshopId,
    workshopTitle: "Registered workshop",
    status,
    message: registrationMessage(status, "FREE", item.paymentStatus),
    notification: item.qrAvailable
      ? "Registration confirmed. Check your email for the check-in ticket."
      : "Complete payment to confirm this registration.",
  };
}

function toManagedWorkshop(workshop: Workshop): ManagedWorkshop {
  const registrations = Math.max(0, workshop.capacity - workshop.remainingSeats);
  return {
    ...workshop,
    registrations,
    checkedIn: 0,
    revenue: workshop.feeType === "PAID" ? workshop.feeAmount * registrations : 0,
  };
}

function toCreateSessionBody(values: WorkshopFormValues): CreateSessionBody {
  if (!values.roomId) {
    throw new Error("Select a room before saving.");
  }

  return {
    roomId: values.roomId,
    startAt: toLocalDateTime(values.date, values.startTime),
    endAt: toLocalDateTime(values.date, values.endTime),
    seatCapacity: Number(values.capacity),
    feeType: values.feeType,
    feeAmount: Number(values.feeAmount || "0"),
    currency: "VND",
  };
}

function toUpdateSessionBody(values: WorkshopFormValues): UpdateSessionBody {
  return toCreateSessionBody(values);
}

function formatRoom(roomName?: string, building?: string) {
  if (!roomName) {
    return "Room not set";
  }
  return building ? `${building} ${roomName}` : roomName;
}

function normalizeStatus(status: string, remainingSeats?: number): WorkshopStatus {
  if (status === "CANCELED") {
    return "CANCELLED";
  }
  if (status === "PUBLISHED" && remainingSeats === 0) {
    return "FULL";
  }
  if (status === "DRAFT" || status === "PUBLISHED" || status === "CANCELLED") {
    return status;
  }
  return "DRAFT";
}

function normalizeRegistrationStatus(status: string): Registration["status"] {
  if (
    status === "CONFIRMED" ||
    status === "PENDING_PAYMENT" ||
    status === "PAYMENT_FAILED" ||
    status === "EXPIRED" ||
    status === "CANCELED"
  ) {
    return status;
  }
  return "PENDING_PAYMENT";
}

function registrationMessage(
  status: Registration["status"],
  type?: string,
  paymentStatus?: string | null,
) {
  if (status === "CONFIRMED") {
    return "Registration confirmed.";
  }
  if (status === "PENDING_PAYMENT" || paymentStatus === "PENDING") {
    return type === "PAID"
      ? "Payment is pending. Complete payment to confirm your seat."
      : "Registration is waiting for confirmation.";
  }
  if (status === "PAYMENT_FAILED") {
    return "Payment failed. Please try registering again.";
  }
  if (status === "EXPIRED") {
    return "This registration expired.";
  }
  return "This registration was canceled.";
}

function buildStats(workshops: ManagedWorkshop[]) {
  return {
    totalWorkshops: workshops.length,
    totalRegistrations: workshops.reduce((sum, item) => sum + item.registrations, 0),
    checkedInCount: workshops.reduce((sum, item) => sum + item.checkedIn, 0),
    paidRegistrationCount: workshops
      .filter((item) => item.feeType === "PAID")
      .reduce((sum, item) => sum + item.registrations, 0),
    cancelledWorkshops: workshops.filter((item) => item.status === "CANCELLED")
      .length,
  };
}
