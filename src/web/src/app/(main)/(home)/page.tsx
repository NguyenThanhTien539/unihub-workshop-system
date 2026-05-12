"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Search, SlidersHorizontal } from "lucide-react";
import WorkshopCard from "../../../components/WorkshopCard";
import {
  listPublicWorkshops,
  type FeeType,
  type WorkshopListItem,
} from "../../../lib/workshops";

export default function Home() {
  const [workshops, setWorkshops] = useState<WorkshopListItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [feeType, setFeeType] = useState<FeeType | "">("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      keyword,
      feeType,
      date,
      size: 100,
    }),
    [keyword, feeType, date],
  );

  useEffect(() => {
    let mounted = true;

    async function loadWorkshops() {
      setLoading(true);
      setError(null);

      try {
        const data = await listPublicWorkshops(filters);
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

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Khám phá workshop</h2>
          <p className="mt-1 text-sm text-slate-600">
            Duyệt các workshop đã xuất bản, kiểm tra lịch học, phòng và số chỗ còn lại.
          </p>
        </div>

        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[1fr_auto_auto]">
          <label className="flex min-w-0 items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
            <Search size={16} className="shrink-0 text-slate-500" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tên workshop, diễn giả hoặc mô tả"
              className="min-w-0 flex-1 outline-none"
            />
          </label>

          <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
            <CalendarDays size={16} className="text-slate-500" />
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="outline-none"
            />
          </label>

          <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
            <SlidersHorizontal size={16} className="text-slate-500" />
            <select
              value={feeType}
              onChange={(event) => setFeeType(event.target.value === "PAID" ? "PAID" : event.target.value === "FREE" ? "FREE" : "")}
              className="bg-white outline-none"
            >
              <option value="">Tất cả phí</option>
              <option value="FREE">Miễn phí</option>
              <option value="PAID">Có phí</option>
            </select>
          </label>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-96 animate-pulse rounded-lg bg-white shadow-sm" />
          ))}
        </div>
      ) : workshops.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {workshops.map((workshop) => (
            <WorkshopCard key={workshop.id} workshop={workshop} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          Không tìm thấy workshop phù hợp với bộ lọc hiện tại.
        </div>
      )}
    </section>
  );
}
