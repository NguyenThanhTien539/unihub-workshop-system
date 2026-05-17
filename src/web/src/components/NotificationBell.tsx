"use client";

import { Bell } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "../lib/apiClient";
import {
  getMyNotifications,
  markNotificationRead,
  notificationStatusLabel,
  type UserNotification,
} from "../lib/notifications";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  useEffect(() => {
    void loadNotifications(false);
  }, []);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function loadNotifications(showSpinner = true) {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      setNotifications(await getMyNotifications());
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Không thể tải thông báo. Vui lòng thử lại."));
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  async function markRead(notification: UserNotification) {
    if (notification.read) return;
    try {
      await markNotificationRead(notification.id);
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
      );
      toast.success("Đã đánh dấu thông báo là đã đọc.");
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, "Không thể cập nhật thông báo. Vui lòng thử lại."));
    }
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void loadNotifications(false);
        }}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
        aria-label="Thông báo"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[11px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-[min(380px,calc(100vw-32px))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">Thông báo</h3>
              <p className="text-xs text-slate-500">{unreadCount > 0 ? `${unreadCount} mới` : "Không có thông báo mới"}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadNotifications()}
              className="text-xs font-medium text-sky-700 hover:text-sky-900"
            >
              Làm mới
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Đang tải thông báo...</div>
            ) : error ? (
              <div className="px-4 py-8 text-center text-sm text-red-600">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Bạn chưa có thông báo nào.</div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void markRead(notification)}
                  className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
                    notification.read ? "bg-white" : "bg-sky-50/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">{notification.title}</div>
                      <p className="mt-1 line-clamp-3 text-sm leading-5 text-slate-600">{notification.message}</p>
                    </div>
                    {!notification.read ? (
                      <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                        Mới
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{formatNotificationDate(notification.createdAt)}</span>
                    <span>·</span>
                    <span>{notificationStatusLabel(notification.status, notification.read)}</span>
                    {!notification.read ? (
                      <>
                        <span>·</span>
                        <span className="font-medium text-sky-700">Đánh dấu đã đọc</span>
                      </>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-slate-100 px-4 py-3 text-right text-xs font-medium text-slate-500">
            Xem tất cả
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}
