import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import Link from "next/link";

type Workshop = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  seats?: string;
  price?: string;
  tag?: string;
  image?: string;
  free?: boolean;
};

export default function WorkshopCard({
  workshop,
}: {
  workshop: Workshop;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Image */}
      <div className="relative">
        <img
          src={workshop.image}
          alt={workshop.title}
          className="h-48 w-full object-cover"
        />

        {/* Tag */}
        {workshop.tag && (
          <div className="absolute left-3 top-3 rounded-full bg-white/80 px-3 py-1 text-xs font-medium">
            {workshop.tag}
          </div>
        )}

        {/* Price / Free */}
        {(workshop.price || workshop.free) && (
          <div className="absolute right-3 top-3 rounded-full bg-black/80 px-3 py-1 text-xs font-semibold text-white">
            {workshop.free ? "Miễn phí" : workshop.price}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-base font-semibold text-slate-900">
          {workshop.title}
        </h3>

        <p className="mt-2 text-sm text-slate-600 line-clamp-2">
          {workshop.description}
        </p>

        {/* Info */}
        <div className="mt-4 space-y-2 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} />
            <span>{workshop.date}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock size={16} />
            <span>{workshop.time}</span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin size={16} />
            <span>{workshop.location}</span>
          </div>

          {workshop.seats && (
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>{workshop.seats}</span>
            </div>
          )}
        </div>

        {/* Button */}
        <Link href={`/workshop/${workshop.id}`} className="mt-4 block w-full rounded-lg bg-slate-900 py-2 text-center text-sm font-semibold text-white hover:bg-black">
          Xem chi tiết & Đăng ký
        </Link>
      </div>
    </div>
  );
}