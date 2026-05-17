"use client";

import { apiRequest } from "./apiClient";

export type NotificationDeliveryStatus = "PENDING" | "SENT" | "FAILED" | "RETRYING" | "READ";
export type NotificationChannel = "IN_APP" | "EMAIL";

export type UserNotification = {
  id: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  read: boolean;
  createdAt: string;
};

export type MarkNotificationReadResponse = {
  notificationId: string;
  read: boolean;
  readAt: string;
};

export async function getMyNotifications() {
  return apiRequest<UserNotification[]>("/api/notifications/me", undefined, { auth: true });
}

export async function markNotificationRead(notificationId: string) {
  return apiRequest<MarkNotificationReadResponse>(
    `/api/notifications/${notificationId}/read`,
    { method: "PATCH" },
    { auth: true },
  );
}

export function notificationStatusLabel(status: string, read: boolean) {
  if (read) return "Đã đọc";
  switch (status) {
    case "PENDING":
      return "Đang gửi";
    case "SENT":
      return "Đã gửi";
    case "FAILED":
      return "Gửi thất bại";
    case "RETRYING":
      return "Đang thử lại";
    case "READ":
      return "Đã đọc";
    default:
      return "Thông báo";
  }
}

export function notificationChannelLabel(channel: string) {
  switch (channel) {
    case "IN_APP":
      return "Trong ứng dụng";
    case "EMAIL":
      return "Email";
    default:
      return "Thông báo";
  }
}
