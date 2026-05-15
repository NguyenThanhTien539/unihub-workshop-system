"use client";

import { apiRequest } from "./apiClient";

export type FeeType = "FREE" | "PAID";
export type WorkshopStatus = "DRAFT" | "PUBLISHED" | "CANCELED" | "ARCHIVED";
export type SessionStatus = "OPEN" | "CLOSED" | "CANCELED";

export type WorkshopListSession = {
  id: string;
  roomName: string;
  building: string;
  startAt: string;
  endAt: string;
  status: SessionStatus;
  remainingSeats: number;
  feeType: FeeType;
  feeAmount: number | null;
  currency: string | null;
};

export type WorkshopSession = WorkshopListSession & {
  roomId: string;
  seatCapacity: number;
  seatsConfirmed: number;
  seatsReserved: number;
};

export type WorkshopListItem = {
  id: string;
  title: string;
  speaker: string;
  description: string;
  status: WorkshopStatus;
  sessions: WorkshopListSession[];
};

export type WorkshopDetail = {
  id: string;
  title: string;
  speaker: string;
  description: string;
  status: WorkshopStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  canceledAt: string | null;
  sessions: WorkshopSession[];
};

export type Room = {
  id: string;
  name: string;
  building: string;
  capacity: number;
  mapUrl: string | null;
  status: string;
};

export type WorkshopFilters = {
  keyword?: string;
  feeType?: FeeType | "";
  date?: string;
  roomId?: string;
  status?: WorkshopStatus | "";
  page?: number;
  size?: number;
};

export type CreateWorkshopSessionPayload = {
  roomId: string;
  startAt: string;
  endAt: string;
  seatCapacity: number;
  feeType: FeeType;
  feeAmount?: number;
  currency?: string;
};

export type CreateWorkshopPayload = {
  title: string;
  speaker: string;
  description: string;
  sessions: CreateWorkshopSessionPayload[];
};

export type UpdateWorkshopPayload = {
  title?: string;
  speaker?: string;
  description?: string;
};

export type UpdateWorkshopSessionPayload =
  Partial<CreateWorkshopSessionPayload>;

export function getFirstSession(workshop: WorkshopListItem | WorkshopDetail) {
  return workshop.sessions[0] ?? null;
}

export function formatSessionDate(value?: string | null) {
  if (!value) return "Chưa xếp lịch";
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatSessionTime(
  startAt?: string | null,
  endAt?: string | null,
) {
  if (!startAt || !endAt) return "Chua co thoi gian";
  const formatter = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatter.format(new Date(startAt))} - ${formatter.format(new Date(endAt))}`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Chưa cập nhật";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatMoney(amount?: number | null, currency = "VND") {
  const safeAmount = Number(amount ?? 0);
  if (safeAmount <= 0) return "Miễn phí";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(safeAmount);
}

export function formatLocation(
  session?: WorkshopListSession | WorkshopSession | null,
) {
  if (!session) return "Chua co phong";
  return `${session.roomName}, ${session.building}`;
}

export function formatSeatSummary(
  session?: WorkshopListSession | WorkshopSession | null,
) {
  if (!session) return "Chua co suc chua";
  if ("seatCapacity" in session) {
    return `Còn ${session.remainingSeats}/${session.seatCapacity} chỗ`;
  }
  return `Còn ${session.remainingSeats} chỗ`;
}

export function statusLabel(status: string) {
  switch (status) {
    case "DRAFT":
      return "Bản nháp";
    case "PUBLISHED":
      return "Đã công bố";
    case "CANCELED":
      return "Đã hủy";
    case "ARCHIVED":
      return "Đã lưu trữ";
    case "OPEN":
      return "Đang mở đăng ký";
    case "CLOSED":
      return "Đã đóng đăng ký";
    default:
      return status;
  }
}

export function toDateTimeInputValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}

export function toApiDateTime(value: string) {
  if (!value) return value;
  return value.length === 16
    ? `${value}:00`
    : value.replace(/\.\d+Z$/, "").replace(/Z$/, "");
}

export async function listPublicWorkshops(filters: WorkshopFilters = {}) {
  return apiRequest<WorkshopListItem[]>(
    `/api/workshops${queryString(filters)}`,
  );
}

export async function getPublicWorkshop(id: string) {
  return apiRequest<WorkshopDetail>(`/api/workshops/${id}`);
}

export async function listAdminWorkshops(filters: WorkshopFilters = {}) {
  return apiRequest<WorkshopDetail[]>(
    `/api/admin/workshops${queryString(filters)}`,
    undefined,
    { auth: true },
  );
}

export async function getAdminWorkshop(id: string) {
  return apiRequest<WorkshopDetail>(`/api/admin/workshops/${id}`, undefined, {
    auth: true,
  });
}

export async function createWorkshop(payload: CreateWorkshopPayload) {
  return apiRequest<WorkshopDetail>(
    "/api/admin/workshops",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { auth: true },
  );
}

export async function updateWorkshop(
  id: string,
  payload: UpdateWorkshopPayload,
) {
  return apiRequest<WorkshopDetail>(
    `/api/admin/workshops/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { auth: true },
  );
}

export async function publishWorkshop(id: string) {
  return apiRequest<WorkshopDetail>(
    `/api/admin/workshops/${id}/publish`,
    { method: "POST" },
    { auth: true },
  );
}

export async function cancelWorkshop(id: string) {
  return apiRequest<WorkshopDetail>(
    `/api/admin/workshops/${id}/cancel`,
    { method: "POST" },
    { auth: true },
  );
}

export async function createWorkshopSession(
  id: string,
  payload: CreateWorkshopSessionPayload,
) {
  return apiRequest<WorkshopSession>(
    `/api/admin/workshops/${id}/sessions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { auth: true },
  );
}

export async function updateWorkshopSession(
  id: string,
  payload: UpdateWorkshopSessionPayload,
) {
  return apiRequest<WorkshopSession>(
    `/api/admin/sessions/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { auth: true },
  );
}

export async function cancelWorkshopSession(id: string) {
  return apiRequest<WorkshopSession>(
    `/api/admin/sessions/${id}/cancel`,
    { method: "POST" },
    { auth: true },
  );
}

export async function listRooms(includeInactive = false) {
  return apiRequest<Room[]>(
    `/api/admin/rooms?includeInactive=${includeInactive}`,
    undefined,
    { auth: true },
  );
}

function queryString(filters: WorkshopFilters) {
  const params = new URLSearchParams();

  if (filters.keyword?.trim()) params.set("keyword", filters.keyword.trim());
  if (filters.feeType) params.set("feeType", filters.feeType);
  if (filters.date) params.set("date", filters.date);
  if (filters.roomId) params.set("roomId", filters.roomId);
  if (filters.status) params.set("status", filters.status);
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.size !== undefined) params.set("size", String(filters.size));

  const value = params.toString();
  return value ? `?${value}` : "";
}
