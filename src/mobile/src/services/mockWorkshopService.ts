import {
  ManagedWorkshop,
  Registration,
  Workshop,
  WorkshopFormValues,
} from "../models/types";
import {
  sampleManagedWorkshops,
  sampleOrganizerStats,
  sampleRegistrations,
  sampleWorkshops,
} from "../sampleData/mockData";

export async function getWorkshops(): Promise<Workshop[]> {
  // TODO: Replace this mock with:
  // GET /api/workshops
  // Expected response: { success: true, data: [{ workshopId, title, speaker, sessions }] }
  // Keep browsing available when payment, notification, or AI providers are down.
  return sampleWorkshops;
}

export async function getMyRegistrations(): Promise<Registration[]> {
  // TODO: Replace this mock with:
  // GET /api/registrations/me
  // Expected response: { success: true, data: [{ registrationId, status, qrTicketId }] }
  return sampleRegistrations;
}

export async function registerForWorkshop(
  workshop: Workshop,
  studentId: string,
): Promise<Registration> {
  // TODO: Replace mock registration with:
  // POST /api/workshops/{workshopId}/register
  // Body: { studentId, idempotencyKey }
  // Expected response: { registrationId, status, qrToken }
  // Handle 409 when workshop is full.
  // Handle payment timeout safely using idempotency key.
  await delay(500);

  if (
    workshop.remainingSeats <= 0 ||
    workshop.status === "FULL" ||
    workshop.status === "CANCELLED"
  ) {
    throw new Error("This workshop is full. Try another session.");
  }

  if (workshop.feeType === "PAID") {
    return {
      id: `reg-${workshop.id}`,
      workshopId: workshop.id,
      workshopTitle: workshop.title,
      status: "PENDING_PAYMENT",
      message:
        "Payment is temporarily unavailable. You can still browse workshops.",
      notification:
        "Paid registration is pending. A QR ticket will be issued only after verified payment.",
    };
  }

  return {
    id: `reg-${workshop.id}`,
    workshopId: workshop.id,
    workshopTitle: workshop.title,
    status: "CONFIRMED",
    qrToken: `UNI-${studentId}-${workshop.id}-QR`,
    message: "Registration confirmed. Your QR ticket is ready.",
    notification: `Confirmation sent for ${workshop.title} in ${workshop.room}.`,
  };
}

export async function getOrganizerDashboard() {
  // TODO: Replace with organizer APIs:
  // GET /api/admin/workshops
  // GET /api/admin/registrations/stats
  // Expected response: dashboard counters and workshop summaries.
  return {
    stats: sampleOrganizerStats,
    workshops: sampleManagedWorkshops,
  };
}

export async function createWorkshop(
  values: WorkshopFormValues,
): Promise<ManagedWorkshop> {
  // TODO: Replace mock create with real backend call:
  // POST /api/admin/workshops
  // Headers: Authorization: Bearer <accessToken>
  // Body: {
  //   title, speakerName, speakerBio, startTime, endTime,
  //   room, capacity, price, description, summary, status
  // }
  // Expected response: { workshopId, status, createdAt }
  // Handle 400 validation errors and 403 if user is not ORGANIZER.
  await delay(350);
  const capacity = Number(values.capacity);
  const feeAmount = Number(values.feeAmount || "0");

  return {
    id: `w-${Date.now()}`,
    title: values.title.trim(),
    speaker: values.speaker.trim(),
    speakerTitle: "Workshop Speaker",
    speakerBio: values.speakerBio.trim(),
    date: values.date.trim(),
    startTime: values.startTime.trim(),
    endTime: values.endTime.trim(),
    time: `${values.startTime.trim()} - ${values.endTime.trim()}`,
    room: values.room.trim(),
    roomHint: values.roomHint.trim(),
    remainingSeats: capacity,
    capacity,
    feeType: values.feeType,
    feeAmount,
    description: values.description.trim(),
    summary: values.summary.trim(),
    tags: ["Organizer", values.feeType],
    status: values.status,
    registrations: 0,
    checkedIn: 0,
    revenue: 0,
  };
}

export async function updateWorkshop(
  workshop: ManagedWorkshop,
  values: WorkshopFormValues,
): Promise<ManagedWorkshop> {
  // TODO: Replace mock update with real backend call:
  // PATCH /api/admin/workshops/{workshopId}
  // Headers: Authorization: Bearer <accessToken>
  // Body: partial workshop update fields
  // Expected response: { workshopId, updatedAt, status }
  // Handle 400 validation errors, 403 unauthorized role, and 409 if capacity
  // is lower than current registrations.
  await delay(350);
  const capacity = Number(values.capacity);
  const feeAmount = Number(values.feeAmount || "0");
  const remainingSeats = Math.max(0, capacity - workshop.registrations);

  return {
    ...workshop,
    title: values.title.trim(),
    speaker: values.speaker.trim(),
    speakerBio: values.speakerBio.trim(),
    date: values.date.trim(),
    startTime: values.startTime.trim(),
    endTime: values.endTime.trim(),
    time: `${values.startTime.trim()} - ${values.endTime.trim()}`,
    room: values.room.trim(),
    roomHint: values.roomHint.trim(),
    capacity,
    remainingSeats,
    feeType: values.feeType,
    feeAmount,
    description: values.description.trim(),
    summary: values.summary.trim(),
    status: remainingSeats === 0 && values.status === "PUBLISHED" ? "FULL" : values.status,
    revenue: values.feeType === "PAID" ? feeAmount * workshop.registrations : 0,
  };
}

export async function cancelWorkshop(
  workshop: ManagedWorkshop,
  reason: string,
): Promise<ManagedWorkshop | null> {
  // TODO: Prefer soft cancel instead of hard delete:
  // PATCH /api/admin/workshops/{workshopId}/cancel
  // Headers: Authorization: Bearer <accessToken>
  // Body: { reason }
  // Expected response: { workshopId, status: "CANCELLED", cancelledAt }
  // Backend should notify registered students asynchronously.
  //
  // TODO: Only allow hard delete for draft workshops with no registrations:
  // DELETE /api/admin/workshops/{workshopId}
  // Expected: 204 No Content
  await delay(300);

  if (workshop.registrations === 0 && workshop.status === "DRAFT") {
    return null;
  }

  return {
    ...workshop,
    status: "CANCELLED",
    remainingSeats: 0,
    summary: reason.trim()
      ? `${workshop.summary} Cancellation note: ${reason.trim()}`
      : workshop.summary,
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
