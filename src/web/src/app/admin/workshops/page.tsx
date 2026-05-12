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

type QuickFilter = "ALL" | "TODAY" | "UPCOMING" | "PAST";

type ScheduleFilters = {
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
  quickFilter: QuickFilter;
};

const emptyScheduleFilters: ScheduleFilters = {
  dateFrom: "",
  dateTo: "",
  timeFrom: "",
  timeTo: "",
  quickFilter: "ALL",
};

export default function WorkshopsAdminPage() {
  const [workshops, setWorkshops] = useState<WorkshopDetail[]>([]);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<WorkshopStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("ALL");
  const [filterError, setFilterError] = useState("");
  const [appliedScheduleFilters, setAppliedScheduleFilters] = useState<ScheduleFilters>(emptyScheduleFilters);

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
  const filteredWorkshops = useMemo(
    () => workshops.filter((workshop) => matchesSchedule(workshop, appliedScheduleFilters)),
    [appliedScheduleFilters, workshops],
  );

  function applyScheduleFilters() {
    const validationError = validateFilters(dateFrom, dateTo, timeFrom, timeTo);
    if (validationError) {
      setFilterError(validationError);
      return;
    }

    setAppliedScheduleFilters({ dateFrom, dateTo, timeFrom, timeTo, quickFilter });
    setFilterError("");
  }

  function clearScheduleFilters() {
    setDateFrom("");
    setDateTo("");
    setTimeFrom("");
    setTimeTo("");
    setQuickFilter("ALL");
    setAppliedScheduleFilters(emptyScheduleFilters);
    setFilterError("");
  }

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

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-sm font-semibold text-slate-950">Lọc theo lịch</h3>
          <div className="flex flex-wrap gap-2">
            {(["ALL", "TODAY", "UPCOMING", "PAST"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setQuickFilter(item)}
                className={`rounded-md px-3 py-2 text-xs font-medium ${
                  quickFilter === item ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {quickFilterLabel(item)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Field label="Từ ngày">
            <input value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} type="date" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none" />
          </Field>
          <Field label="Đến ngày">
            <input value={dateTo} onChange={(event) => setDateTo(event.target.value)} type="date" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none" />
          </Field>
          <Field label="Từ giờ">
            <input value={timeFrom} onChange={(event) => setTimeFrom(event.target.value)} type="time" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none" />
          </Field>
          <Field label="Đến giờ">
            <input value={timeTo} onChange={(event) => setTimeTo(event.target.value)} type="time" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none" />
          </Field>
        </div>
        {filterError && <p className="mt-3 text-sm font-medium text-red-600">{filterError}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={applyScheduleFilters} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Áp dụng
          </button>
          <button type="button" onClick={clearScheduleFilters} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
            Xóa lọc
          </button>
          <span className="text-xs text-slate-500">{describeFilters(appliedScheduleFilters)}</span>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Đang tải workshop...</div>
        ) : filteredWorkshops.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Không có workshop phù hợp.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredWorkshops.map((workshop) => {
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-slate-700">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
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

function validateFilters(dateFrom: string, dateTo: string, timeFrom: string, timeTo: string) {
  if (dateFrom && !isValidDate(dateFrom)) return "Ngày bắt đầu phải đúng định dạng YYYY-MM-DD.";
  if (dateTo && !isValidDate(dateTo)) return "Ngày kết thúc phải đúng định dạng YYYY-MM-DD.";
  if (timeFrom && !isValidTime(timeFrom)) return "Giờ bắt đầu phải đúng định dạng HH:mm.";
  if (timeTo && !isValidTime(timeTo)) return "Giờ kết thúc phải đúng định dạng HH:mm.";
  if (dateFrom && dateTo && dateTo < dateFrom) return "Ngày kết thúc không được trước ngày bắt đầu.";
  if (timeFrom && timeTo && timeTo < timeFrom) return "Giờ kết thúc không được trước giờ bắt đầu.";
  return "";
}

function matchesSchedule(workshop: WorkshopDetail, filters: ScheduleFilters) {
  if (!hasActiveScheduleFilter(filters)) return true;
  return workshop.sessions.some((session) => matchesScheduleSession(session, filters));
}

function hasActiveScheduleFilter(filters: ScheduleFilters) {
  return Boolean(
    filters.dateFrom ||
      filters.dateTo ||
      filters.timeFrom ||
      filters.timeTo ||
      filters.quickFilter !== "ALL",
  );
}

function matchesScheduleSession(
  session: { startAt?: string; endAt?: string },
  filters: ScheduleFilters,
) {
  const startAt = session.startAt ? new Date(session.startAt) : null;
  const endAt = session.endAt ? new Date(session.endAt) : startAt;
  if (!startAt || Number.isNaN(startAt.getTime())) return false;

  const date = formatLocalDate(startAt);
  const time = formatLocalTime(startAt);
  const today = formatLocalDate(new Date());
  const now = new Date();

  if (filters.quickFilter === "TODAY" && date !== today) return false;
  if (filters.quickFilter === "UPCOMING" && startAt < now) return false;
  if (filters.quickFilter === "PAST" && endAt && endAt >= now) return false;
  if (filters.dateFrom && date < filters.dateFrom) return false;
  if (filters.dateTo && date > filters.dateTo) return false;
  if (filters.timeFrom && time < filters.timeFrom) return false;
  if (filters.timeTo && time > filters.timeTo) return false;

  return true;
}

function describeFilters(filters: ScheduleFilters) {
  const parts = [];
  if (filters.quickFilter !== "ALL") parts.push(quickFilterLabel(filters.quickFilter).toLowerCase());
  if (filters.dateFrom) parts.push(`từ ${filters.dateFrom}`);
  if (filters.dateTo) parts.push(`đến ${filters.dateTo}`);
  if (filters.timeFrom) parts.push(`sau ${filters.timeFrom}`);
  if (filters.timeTo) parts.push(`trước ${filters.timeTo}`);
  return parts.length ? `Đang lọc: ${parts.join(", ")}` : "Chưa áp dụng lọc lịch";
}

function quickFilterLabel(filter: QuickFilter) {
  if (filter === "TODAY") return "Hôm nay";
  if (filter === "UPCOMING") return "Sắp tới";
  if (filter === "PAST") return "Đã qua";
  return "Tất cả";
}

function isValidDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return (
    date.getFullYear() === Number(match[1]) &&
    date.getMonth() === Number(match[2]) - 1 &&
    date.getDate() === Number(match[3])
  );
}

function isValidTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatLocalTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
