"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureAdminAuth, fetchWithAuth } from "../../../lib/adminAuth";

type QuickFilter = "ALL" | "TODAY" | "UPCOMING" | "PAST";

type WorkshopSummary = {
  id: string;
  title: string;
  speaker: string;
  description: string;
  status: string;
  sessions: Array<{
    startAt?: string;
    endAt?: string;
  }>;
};

type ScheduleFilters = {
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
  quickFilter: QuickFilter;
};

const emptyFilters: ScheduleFilters = {
  dateFrom: "",
  dateTo: "",
  timeFrom: "",
  timeTo: "",
  quickFilter: "ALL",
};

export default function WorkshopsAdminPage() {
  const [workshops, setWorkshops] = useState<WorkshopSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("ALL");
  const [filterError, setFilterError] = useState("");
  const [appliedFilters, setAppliedFilters] =
    useState<ScheduleFilters>(emptyFilters);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const ok = await ensureAdminAuth();
      if (!ok) {
        window.location.href = "/auth/login?role=organizer";
        return;
      }
      try {
        const r = await fetchWithAuth("/api/admin/workshops");
        const json = await r.json();
        const data = json?.data ?? [];
        setWorkshops(data);
      } catch (e) {
        setWorkshops([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredWorkshops = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return workshops.filter((workshop) => {
      const matchesQuery =
        !normalizedQuery ||
        workshop.title.toLowerCase().includes(normalizedQuery) ||
        workshop.speaker.toLowerCase().includes(normalizedQuery);

      return matchesQuery && matchesSchedule(workshop, appliedFilters);
    });
  }, [appliedFilters, query, workshops]);

  function applyFilters() {
    const error = validateFilters(dateFrom, dateTo, timeFrom, timeTo);
    if (error) {
      setFilterError(error);
      return;
    }

    setAppliedFilters({ dateFrom, dateTo, timeFrom, timeTo, quickFilter });
    setFilterError("");
  }

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setTimeFrom("");
    setTimeTo("");
    setQuickFilter("ALL");
    setAppliedFilters(emptyFilters);
    setFilterError("");
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-slate-700">
            Workshop Management
          </h2>
          <p className="text-sm text-slate-500">
            Manage all workshops in the system.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workshop..."
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          />
          <a
            href="/admin/workshops/create"
            className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + Create
          </a>
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Schedule filters
            </h3>
            <p className="text-xs text-slate-500">
              Date uses YYYY-MM-DD and time uses HH:mm. You can type or use the
              browser picker.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["ALL", "TODAY", "UPCOMING", "PAST"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setQuickFilter(item)}
                className={`rounded-md px-3 py-2 text-xs font-medium ${
                  quickFilter === item
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {item === "ALL"
                  ? "All"
                  : item.charAt(0) + item.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="text-xs font-medium text-slate-700">
            Date from
            <input
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              type="date"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            Date to
            <input
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              type="date"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            Time from
            <input
              value={timeFrom}
              onChange={(e) => setTimeFrom(e.target.value)}
              type="time"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            Time to
            <input
              value={timeTo}
              onChange={(e) => setTimeTo(e.target.value)}
              type="time"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        {filterError ? (
          <p className="mt-3 text-sm font-medium text-red-600">{filterError}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Apply filter
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Clear filter
          </button>
          <span className="text-xs text-slate-500">
            {describeFilters(appliedFilters)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        <StatCard label="Total Workshops" value={workshops.length} />
        <StatCard
          label="Published"
          value={workshops.filter((w) => w.status === "PUBLISHED").length}
          tone="text-green-600"
        />
        <StatCard
          label="Draft"
          value={workshops.filter((w) => w.status === "DRAFT").length}
          tone="text-amber-600"
        />
        <StatCard
          label="Cancelled"
          value={
            workshops.filter(
              (w) => w.status === "CANCELED" || w.status === "CANCELLED",
            ).length
          }
          tone="text-red-600"
        />
        <StatCard
          label="Total Sessions"
          value={workshops.reduce((acc, w) => acc + (w.sessions?.length ?? 0), 0)}
          tone="text-sky-600"
        />
      </div>

      <div className="mt-4 rounded-lg bg-white p-6 shadow">
        {loading && <p>Loading workshops...</p>}
        {!loading && filteredWorkshops.length === 0 && (
          <div className="rounded-lg border bg-white p-4">
            No workshops match the current filters.
          </div>
        )}

        <ul className="divide-y">
          {filteredWorkshops.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-4 py-4">
              <div>
                <a
                  href={`/admin/workshops/${w.id}`}
                  className="text-lg font-semibold text-slate-900"
                >
                  {w.title}
                </a>
                <div className="text-sm text-slate-600">Speaker: {w.speaker}</div>
                <div className="mt-2 text-sm text-slate-700">{w.description}</div>
                <div className="mt-2 text-xs text-slate-500">
                  {formatSessionSummary(w.sessions?.[0])}
                </div>
              </div>
              <div className="flex w-56 shrink-0 items-center justify-end gap-4">
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-700">
                    {w.sessions?.length ?? 0} sessions
                  </div>
                  <div className="mt-2 text-sm font-medium text-white">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${
                        w.status === "PUBLISHED"
                          ? "bg-slate-900"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>
                </div>
                <a href={`/admin/workshops/${w.id}`} className="text-sky-600">
                  View detail
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function validateFilters(
  dateFrom: string,
  dateTo: string,
  timeFrom: string,
  timeTo: string,
) {
  if (dateFrom && !isValidDate(dateFrom)) return "Date from must use YYYY-MM-DD.";
  if (dateTo && !isValidDate(dateTo)) return "Date to must use YYYY-MM-DD.";
  if (timeFrom && !isValidTime(timeFrom)) return "Time from must use HH:mm.";
  if (timeTo && !isValidTime(timeTo)) return "Time to must use HH:mm.";
  if (dateFrom && dateTo && dateTo < dateFrom) {
    return "Date to cannot be earlier than Date from.";
  }
  if (timeFrom && timeTo && timeTo < timeFrom) {
    return "Time to cannot be earlier than Time from.";
  }
  return "";
}

function matchesSchedule(workshop: WorkshopSummary, filters: ScheduleFilters) {
  if (!hasActiveScheduleFilter(filters)) return true;

  const sessions = workshop.sessions?.length ? workshop.sessions : [];
  return sessions.some((session) => matchesScheduleSession(session, filters));
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
  const startAt = session?.startAt ? new Date(session.startAt) : null;
  const endAt = session?.endAt ? new Date(session.endAt) : startAt;
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
  if (filters.quickFilter !== "ALL") parts.push(filters.quickFilter.toLowerCase());
  if (filters.dateFrom) parts.push(`from ${filters.dateFrom}`);
  if (filters.dateTo) parts.push(`to ${filters.dateTo}`);
  if (filters.timeFrom) parts.push(`after ${filters.timeFrom}`);
  if (filters.timeTo) parts.push(`before ${filters.timeTo}`);
  return parts.length ? `Active: ${parts.join(", ")}` : "No schedule filter applied";
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

function formatSessionSummary(session?: { startAt?: string; endAt?: string }) {
  if (!session?.startAt) return "No session scheduled";
  const startAt = new Date(session.startAt);
  const endAt = session.endAt ? new Date(session.endAt) : null;
  if (Number.isNaN(startAt.getTime())) return "No session scheduled";
  return `${formatLocalDate(startAt)} ${formatLocalTime(startAt)}${
    endAt && !Number.isNaN(endAt.getTime()) ? ` - ${formatLocalTime(endAt)}` : ""
  }`;
}

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatLocalTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}
