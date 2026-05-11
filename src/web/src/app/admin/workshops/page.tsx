"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Plus, Search } from "lucide-react";
import { ensureAdminAuth } from "../../../lib/adminAuth";
import {
  formatLocation,
  formatSessionDate,
  formatSessionTime,
  getFirstSession,
  listAdminWorkshops,
  statusLabel,
  type WorkshopDetail,
  type WorkshopStatus,
} from "../../../lib/workshops";

export default function WorkshopsAdminPage() {
  const [workshops, setWorkshops] = useState<WorkshopDetail[]>([]);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<WorkshopStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      keyword,
      status,
      size: 100,
    }),
    [keyword, status],
  );

  useEffect(() => {
    let mounted = true;

    async function loadWorkshops() {
      setLoading(true);
      setError(null);

      const ok = await ensureAdminAuth();
      if (!ok) {
        window.location.href = "/auth/login?role=organizer";
        return;
      }

      try {
        const data = await listAdminWorkshops(filters);
        if (mounted) setWorkshops(data);
      } catch (err) {
        if (mounted) {
          setWorkshops([]);
          setError(err instanceof Error ? err.message : "Không tải được danh sách workshop");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    const timeout = window.setTimeout(loadWorkshops, 250);
    return () => {
      mounted = false;
      window.clearTimeout(timeout);
    };
  }, [filters]);

  const totalSessions = workshops.reduce((total, workshop) => total + workshop.sessions.length, 0);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Quản lý workshop</h2>
          <p className="mt-1 text-sm text-slate-500">Tạo, xuất bản, hủy và quản lý lịch học của workshop.</p>
        </div>
        <Link
          href="/admin/workshops/create"
          className="inline-flex w-fit items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus size={16} />
          Tạo mới
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Tổng workshop" value={workshops.length} />
        <Stat label="Đã xuất bản" value={workshops.filter((item) => item.status === "PUBLISHED").length} tone="green" />
        <Stat label="Nháp" value={workshops.filter((item) => item.status === "DRAFT").length} tone="amber" />
        <Stat label="Đã hủy" value={workshops.filter((item) => item.status === "CANCELED").length} tone="red" />
        <Stat label="Tổng session" value={totalSessions} tone="sky" />
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[1fr_auto]">
        <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
          <Search size={16} className="text-slate-500" />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm workshop hoặc diễn giả"
            className="min-w-0 flex-1 outline-none"
          />
        </label>
        <select
          value={status}
          onChange={(event) => setStatus(parseStatus(event.target.value))}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Nháp</option>
          <option value="PUBLISHED">Đã xuất bản</option>
          <option value="CANCELED">Đã hủy</option>
          <option value="ARCHIVED">Lưu trữ</option>
        </select>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Đang tải workshop...</div>
        ) : workshops.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Không có workshop phù hợp.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {workshops.map((workshop) => {
              const firstSession = getFirstSession(workshop);
              return (
                <li key={workshop.id} className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/workshops/${workshop.id}`}
                          className="text-lg font-semibold text-slate-950 hover:text-sky-700"
                        >
                          {workshop.title}
                        </Link>
                        <span className={statusClass(workshop.status)}>{statusLabel(workshop.status)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">Diễn giả: {workshop.speaker}</p>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-700">{workshop.description}</p>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays size={15} />
                          {formatSessionDate(firstSession?.startAt)}
                        </span>
                        <span>{formatSessionTime(firstSession?.startAt, firstSession?.endAt)}</span>
                        <span>{formatLocation(firstSession)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-4 lg:w-56 lg:justify-end">
                      <div className="text-sm text-slate-600">{workshop.sessions.length} session</div>
                      <Link href={`/admin/workshops/${workshop.id}`} className="text-sm font-medium text-sky-700 hover:text-sky-900">
                        Chi tiết
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "green" | "amber" | "red" | "sky" }) {
  const color =
    tone === "green"
      ? "text-green-600"
      : tone === "amber"
        ? "text-amber-600"
        : tone === "red"
          ? "text-red-600"
          : tone === "sky"
            ? "text-sky-600"
            : "text-slate-950";

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function parseStatus(value: string): WorkshopStatus | "" {
  if (value === "DRAFT" || value === "PUBLISHED" || value === "CANCELED" || value === "ARCHIVED") {
    return value;
  }
  return "";
}

function statusClass(status: WorkshopStatus) {
  if (status === "PUBLISHED") return "rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700";
  if (status === "DRAFT") return "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700";
  if (status === "CANCELED") return "rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700";
  return "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700";
}
