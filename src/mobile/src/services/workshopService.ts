import {
  ManagedWorkshop,
  Registration,
  Room,
  Workshop,
  WorkshopFormValues,
  WorkshopStatus,
} from "../models/types";
import { apiRequest } from "./apiClient";

type BackendWorkshopListSession = {
  id: string;
  roomName: string;
  building: string;
  startAt: string;
  endAt: string;
  status: string;
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

export async function getWorkshops(): Promise<Workshop[]> {
  const response = await apiRequest<BackendWorkshopListItem[]>("/api/workshops");
  return response.map(mapWorkshopListItem);
}

export async function getWorkshopDetail(workshopId: string): Promise<Workshop> {
  const response = await apiRequest<BackendWorkshop>(`/api/workshops/${workshopId}`);
  return mapWorkshopDetail(response);
}

export async function getMyRegistrations(): Promise<Registration[]> {
  await apiRequest<string>("/api/registrations/auth-test");
  return [];
}

export async function registerForWorkshop(): Promise<Registration> {
  throw new Error("Registration is not available from the current backend API.");
}

export async function getOrganizerDashboard() {
  const workshops = (await getWorkshops()).map(toManagedWorkshop);
  return {
    stats: buildStats(workshops),
    workshops,
  };
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
    sessions: [await toCreateSessionBody(values)],
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
  let updated = await apiRequest<BackendWorkshop>(
    `/api/admin/workshops/${workshop.id}`,
    {
      method: "PATCH",
      body: {
        title: values.title.trim(),
        speaker: values.speaker.trim(),
        description: values.description.trim(),
      },
    },
  );

  const sessionBody = await toCreateSessionBody(values);
  if (workshop.sessionId) {
    const session = await apiRequest<BackendWorkshopSession>(
      `/api/admin/sessions/${workshop.sessionId}`,
      { method: "PATCH", body: sessionBody },
    );
    updated = { ...updated, sessions: replaceSession(updated.sessions, session) };
  } else {
    const session = await apiRequest<BackendWorkshopSession>(
      `/api/admin/workshops/${workshop.id}/sessions`,
      { method: "POST", body: sessionBody },
    );
    updated = { ...updated, sessions: [...updated.sessions, session] };
  }

  if (values.status === "PUBLISHED" && updated.status === "DRAFT") {
    updated = await apiRequest<BackendWorkshop>(
      `/api/admin/workshops/${workshop.id}/publish`,
      { method: "POST" },
    );
  }

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
  return {
    id: item.id,
    sessionId: session?.id,
    title: item.title,
    speaker: item.speaker,
    speakerTitle: "Workshop Speaker",
    speakerBio: item.speaker,
    date: formatDate(session?.startAt),
    startTime: formatTime(session?.startAt),
    endTime: formatTime(session?.endAt),
    time: `${formatTime(session?.startAt)} - ${formatTime(session?.endAt)}`,
    room: formatRoom(session?.roomName, session?.building),
    roomHint: session?.building || "",
    remainingSeats: session?.remainingSeats ?? 0,
    capacity: session?.remainingSeats ?? 0,
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

function toManagedWorkshop(workshop: Workshop): ManagedWorkshop {
  const registrations = Math.max(0, workshop.capacity - workshop.remainingSeats);
  return {
    ...workshop,
    registrations,
    checkedIn: 0,
    revenue: workshop.feeType === "PAID" ? workshop.feeAmount * registrations : 0,
  };
}

async function toCreateSessionBody(
  values: WorkshopFormValues,
): Promise<CreateSessionBody> {
  const room = await resolveRoom(values.room);
  return {
    roomId: room.id,
    startAt: toLocalDateTime(values.date, values.startTime),
    endAt: toLocalDateTime(values.date, values.endTime),
    seatCapacity: Number(values.capacity),
    feeType: values.feeType,
    feeAmount: Number(values.feeAmount || "0"),
    currency: "VND",
  };
}

async function resolveRoom(roomName: string): Promise<Room> {
  const rooms = await getRooms();
  const normalizedName = roomName.trim().toLowerCase();
  const room = rooms.find(
    (item) =>
      item.id === roomName.trim() ||
      item.name.toLowerCase() === normalizedName ||
      `${item.building} ${item.name}`.trim().toLowerCase() === normalizedName,
  );

  if (!room) {
    throw new Error("Room not found. Use a room returned by the backend.");
  }

  return room;
}

function replaceSession(
  sessions: BackendWorkshopSession[],
  nextSession: BackendWorkshopSession,
) {
  return sessions.map((session) =>
    session.id === nextSession.id ? nextSession : session,
  );
}

function toLocalDateTime(dateText: string, timeText: string) {
  const parsedDate = new Date(dateText);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Enter a valid date.");
  }
  const [hours, minutes] = timeText.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    throw new Error("Enter time as HH:mm.");
  }

  parsedDate.setHours(hours, minutes, 0, 0);
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T${timeText}:00`;
}

function formatDate(value?: string) {
  if (!value) {
    return "Date not set";
  }
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value?: string) {
  if (!value) {
    return "Time not set";
  }
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
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
