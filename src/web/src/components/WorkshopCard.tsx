import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import Link from "next/link";
import {
  formatLocation,
  formatMoney,
  formatSeatSummary,
  formatSessionDate,
  formatSessionTime,
  getFirstSession,
  type WorkshopListItem,
} from "../lib/workshops";

const CARD_IMAGES = [
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=70",
];

export default function WorkshopCard({ workshop }: { workshop: WorkshopListItem }) {
  const session = getFirstSession(workshop);
  const image = CARD_IMAGES[Math.abs(hashCode(workshop.id)) % CARD_IMAGES.length];

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[16/9] bg-slate-200">
        <img src={image} alt={workshop.title} className="h-full w-full object-cover" />

        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700">
          {workshop.status === "PUBLISHED" ? "Đang mở" : workshop.status}
        </div>

        {session && (
          <div className="absolute right-3 top-3 rounded-full bg-slate-950/85 px-3 py-1 text-xs font-semibold text-white">
            {formatMoney(Number(session.feeAmount), session.currency ?? "VND")}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{workshop.speaker}</div>
        <h3 className="mt-1 line-clamp-2 text-base font-semibold text-slate-950">{workshop.title}</h3>

        <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">{workshop.description}</p>

        <div className="mt-4 space-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} />
            <span>{formatSessionDate(session?.startAt)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock size={16} />
            <span>{formatSessionTime(session?.startAt, session?.endAt)}</span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin size={16} />
            <span>{formatLocation(session)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Users size={16} />
            <span>{formatSeatSummary(session)}</span>
          </div>
        </div>

        <Link
          href={`/workshop/${workshop.id}`}
          className="mt-4 block rounded-lg bg-slate-900 py-2 text-center text-sm font-semibold text-white hover:bg-black"
        >
          Xem chi tiết
        </Link>
      </div>
    </article>
  );
}

function hashCode(value: string) {
  return value.split("").reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 0);
}
