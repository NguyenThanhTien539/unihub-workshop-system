import { CalendarDays, Clock, LoaderCircle, MapPin, QrCode } from "lucide-react";
import type { ReactNode } from "react";
import { formatDateTime, formatMoney, formatSessionDate, formatSessionTime } from "../lib/workshops";

type RegisteredWorkshopCardProps = {
  title: string;
  roomName: string;
  building: string;
  startAt: string;
  endAt: string;
  registrationStatus: string;
  registrationType: string;
  paymentStatus?: string | null;
  amount?: number | null;
  currency?: string | null;
  createdAt: string;
  confirmedAt?: string | null;
  qrAvailable: boolean;
  onShowQr?: () => void;
  qrLoading?: boolean;
  action?: ReactNode;
};

export function RegisteredWorkshopCard({
  title,
  roomName,
  building,
  startAt,
  endAt,
  registrationStatus,
  registrationType,
  paymentStatus,
  amount,
  currency,
  createdAt,
  confirmedAt,
  qrAvailable,
  onShowQr,
  qrLoading = false,
  action,
}: RegisteredWorkshopCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">Đăng ký lúc: {formatDateTime(createdAt)}</p>
              {confirmedAt ? <p className="mt-1 text-sm text-emerald-600">Xác nhận lúc: {formatDateTime(confirmedAt)}</p> : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge tone="slate">{registrationStatus}</Badge>
              <Badge tone={registrationType === "PAID" ? "amber" : "sky"}>
                {registrationType === "PAID" ? `Có phí · ${formatMoney(amount, currency ?? "VND")}` : "Miễn phí"}
              </Badge>
              {paymentStatus ? <Badge tone={paymentStatus === "SUCCEEDED" ? "green" : "amber"}>{paymentStatus}</Badge> : null}
              <Badge tone={qrAvailable ? "green" : "slate"}>{qrAvailable ? "QR sẵn sàng" : "Chưa có QR"}</Badge>
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <InfoCell icon={<CalendarDays size={16} />} value={formatSessionDate(startAt)} />
            <InfoCell icon={<MapPin size={16} />} value={`${roomName}, ${building}`} />
            <InfoCell icon={<Clock size={16} />} value={formatSessionTime(startAt, endAt)} />
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          {qrAvailable && onShowQr ? (
            <button
              type="button"
              onClick={onShowQr}
              disabled={qrLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {qrLoading ? <LoaderCircle size={16} className="animate-spin" /> : <QrCode size={16} />}
              {qrLoading ? "Đang tải QR..." : "Xem mã QR"}
            </button>
          ) : null}

          {action}
        </div>
      </div>
    </div>
  );
}

function InfoCell({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3">
      <span className="text-slate-500">{icon}</span>
      <span>{value}</span>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "slate" | "sky" | "amber" | "green";
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "sky"
          ? "bg-sky-50 text-sky-700"
          : "bg-slate-100 text-slate-700";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}
