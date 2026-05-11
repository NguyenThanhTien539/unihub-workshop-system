import { CalendarDays, Clock, MapPin, QrCode } from "lucide-react";

type RegisteredWorkshopItem = {
  title: string;
  image?: string;
  date: string;
  location: string;
  time: string;
};

export const RegisteredWorkshopCard = ({ item }: { item: RegisteredWorkshopItem }) => {
  return (
    <>
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        {/* Image */}
        <img
          src={item.image}
          alt={item.title}
          className="h-28 w-40 rounded-lg object-cover"
        />

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-base font-semibold text-slate-900">
            {item.title}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Đăng ký lúc: 10:30:00 28/4/2026
          </p>

          {/* Status */}
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white">
              Đã thanh toán
            </span>
            <span className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600">
              Chưa check-in
            </span>
          </div>

          {/* Info row */}
          <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <CalendarDays size={16} />
                {item.date}
              </div>

              <div className="flex items-center gap-1">
                <MapPin size={16} />
                {item.location}
              </div>

              <div className="flex items-center gap-1">
                <Clock size={16} />
                {item.time}
              </div>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-col items-end justify-between">
          <button className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black">
            <QrCode size={16} />
            Xem QR
          </button>
        </div>
      </div>
    </>
  )
}
