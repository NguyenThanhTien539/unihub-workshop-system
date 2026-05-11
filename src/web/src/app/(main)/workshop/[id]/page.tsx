"use client";

import { useEffect, useState, use } from "react";
import { ArrowLeft, Calendar, Clock, MapPin, UserRound, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  formatLocation,
  formatMoney,
  formatSeatSummary,
  formatSessionDate,
  formatSessionTime,
  getFirstSession,
  getPublicWorkshop,
  statusLabel,
  type WorkshopDetail,
} from "../../../../lib/workshops";

export default function WorkshopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [workshop, setWorkshop] = useState<WorkshopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadWorkshop() {
      setLoading(true);
      setError(null);

      try {
        const data = await getPublicWorkshop(resolvedParams.id);
        if (mounted) setWorkshop(data);
      } catch (err) {
        if (mounted) {
          setWorkshop(null);
          setError(err instanceof Error ? err.message : "Không tải được workshop");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadWorkshop();
    return () => {
      mounted = false;
    };
  }, [resolvedParams.id]);

  if (loading) {
    return <div className="min-h-[520px] animate-pulse rounded-lg bg-white" />;
  }

  if (error || !workshop) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-6">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-red-700"
        >
          <ArrowLeft size={16} />
          Quay lại danh sách
        </button>
        <h1 className="text-xl font-semibold text-red-900">Không mở được workshop</h1>
        <p className="mt-2 text-sm text-red-700">{error ?? "Workshop không tồn tại hoặc chưa được xuất bản."}</p>
      </section>
    );
  }

  const firstSession = getFirstSession(workshop);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-lg bg-slate-950 text-white shadow-sm">
        <div className="relative min-h-[360px]">
          <img
            src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1800&q=75"
            alt={workshop.title}
            className="absolute inset-0 h-full w-full object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          <button
            type="button"
            onClick={() => router.push("/")}
            className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2 text-sm backdrop-blur hover:bg-white/25"
          >
            <ArrowLeft size={16} />
            Quay lại
          </button>

          <div className="relative z-10 flex min-h-[360px] flex-col justify-end p-6 sm:p-10">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-950">
                {statusLabel(workshop.status)}
              </span>
              {firstSession && (
                <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold">
                  {formatMoney(Number(firstSession.feeAmount), firstSession.currency)}
                </span>
              )}
            </div>
            <h1 className="max-w-4xl text-3xl font-bold sm:text-5xl">{workshop.title}</h1>
            <div className="mt-5 flex flex-wrap gap-5 text-sm text-white/90">
              <span className="inline-flex items-center gap-2">
                <UserRound size={17} />
                {workshop.speaker}
              </span>
              <span className="inline-flex items-center gap-2">
                <Calendar size={17} />
                {formatSessionDate(firstSession?.startAt)}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock size={17} />
                {formatSessionTime(firstSession?.startAt, firstSession?.endAt)}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin size={17} />
                {formatLocation(firstSession)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Tổng quan</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{workshop.description}</p>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Lịch học và phòng</h2>
            <div className="mt-4 space-y-3">
              {workshop.sessions.length > 0 ? (
                workshop.sessions.map((session) => (
                  <div key={session.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="font-medium text-slate-950">{formatSessionDate(session.startAt)}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          {formatSessionTime(session.startAt, session.endAt)} tại {formatLocation(session)}
                        </div>
                      </div>
                      <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {statusLabel(session.status)}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                      <span>{formatSeatSummary(session)}</span>
                      <span>Đã xác nhận: {session.seatsConfirmed}</span>
                      <span>{formatMoney(Number(session.feeAmount), session.currency)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                  Workshop chưa có session khả dụng.
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Đăng ký tham dự</h2>
            <p className="mt-2 text-sm text-slate-600">
              Module đăng ký chỗ chưa được backend triển khai, nên màn hình này chỉ hiển thị thông tin workshop và số chỗ còn lại.
            </p>
            <button
              type="button"
              disabled
              className="mt-5 w-full rounded-lg bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Đăng ký sẽ được bật ở module Registration
            </button>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Thông tin nhanh</h2>
            <div className="mt-4 space-y-4 text-sm text-slate-700">
              <InfoRow icon={<Calendar size={18} />} label="Ngày tổ chức" value={formatSessionDate(firstSession?.startAt)} />
              <InfoRow icon={<Clock size={18} />} label="Thời gian" value={formatSessionTime(firstSession?.startAt, firstSession?.endAt)} />
              <InfoRow icon={<MapPin size={18} />} label="Địa điểm" value={formatLocation(firstSession)} />
              <InfoRow icon={<Users size={18} />} label="Số chỗ" value={formatSeatSummary(firstSession)} />
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
      <div className="text-sky-600">{icon}</div>
      <div>
        <div className="font-medium text-slate-950">{label}</div>
        <div className="mt-1 text-slate-600">{value}</div>
      </div>
    </div>
  );
}
