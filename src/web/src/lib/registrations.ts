"use client";

import { apiRequest } from "./apiClient";

export type RegistrationStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PAYMENT_FAILED"
  | "EXPIRED"
  | "CANCELED";

export type RegistrationType = "FREE" | "PAID";

export type RegistrationMutationResponse = {
  registrationId: string;
  workshopId: string;
  sessionId: string;
  registrationStatus: RegistrationStatus;
  qrAvailable: boolean;
  paymentIntentId: string | null;
  paymentStatus: string | null;
  amount: number | null;
  currency: string | null;
  expiresAt: string | null;
};

export type RegistrationResponse = {
  registrationId: string;
  workshopId: string;
  workshopTitle: string;
  sessionId: string;
  roomName: string;
  building: string;
  startAt: string;
  endAt: string;
  registrationStatus: RegistrationStatus;
  registrationType: RegistrationType;
  paymentIntentId: string | null;
  paymentStatus: string | null;
  amount: number | null;
  currency: string | null;
  paymentExpiresAt: string | null;
  qrTicketId: string | null;
  qrAvailable: boolean;
  createdAt: string;
  confirmedAt: string | null;
};

export type RegistrationQrResponse = {
  registrationId: string;
  qrTicketId: string;
  dataUrl: string;
  expiresAt: string;
  status: string;
};

export type PaymentUrlResponse = {
  paymentIntentId: string;
  paymentUrl: string;
  provider: string;
  amount: number;
  currency: string;
  expiresAt: string | null;
};

export type PaymentStatusResponse = {
  paymentIntentId: string;
  registrationId: string;
  paymentStatus: string;
  registrationStatus: RegistrationStatus;
  amount: number;
  currency: string;
  provider: string | null;
  providerTransactionId: string | null;
  expiresAt: string | null;
  qrAvailable: boolean;
};

export async function registerFree(sessionId: string) {
  return apiRequest<RegistrationMutationResponse>(
    "/api/registrations/free",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    },
    { auth: true },
  );
}

export async function registerPaid(sessionId: string) {
  return apiRequest<RegistrationMutationResponse>(
    "/api/registrations/paid",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    },
    { auth: true },
  );
}

export async function listMyRegistrations() {
  return apiRequest<RegistrationResponse[]>("/api/registrations/me", undefined, { auth: true });
}

export async function getRegistration(registrationId: string) {
  return apiRequest<RegistrationResponse>(`/api/registrations/${registrationId}`, undefined, { auth: true });
}

export async function getRegistrationQr(registrationId: string) {
  return apiRequest<RegistrationQrResponse>(`/api/registrations/${registrationId}/qr`, undefined, { auth: true });
}

export async function createPaymentUrl(paymentIntentId: string) {
  return apiRequest<PaymentUrlResponse>(
    `/api/payments/intents/${paymentIntentId}/zalopay`,
    { method: "POST" },
    { auth: true },
  );
}

export async function getPaymentStatus(paymentIntentId: string) {
  return apiRequest<PaymentStatusResponse>(`/api/payments/${paymentIntentId}/status`, undefined, { auth: true });
}
