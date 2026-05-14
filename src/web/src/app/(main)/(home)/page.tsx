"use client";

import { useState } from "react";
import WorkshopCard from "../../../components/WorkshopCard";
import { FaFilter } from "react-icons/fa6";
import { FaSearch } from "react-icons/fa";
import { RegisteredWorkshopCard } from "@/components/RegisteredWorkshopCard";

const SAMPLE = [
  {
    id: "1",
    title: "Nền tảng AI và học máy",
    description:
      "Khám phá những kiến thức cơ bản về AI và học máy. Tìm hiểu các thuật toán và ứng dụng thực tế.",
    date: "Thứ Ba, 5 tháng 5",
    time: "09:00 - 11:00",
    location: "Phòng A101",
    seats: "Còn 15/60 chỗ",
    price: "Miễn phí",
    tag: "Công nghệ",
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=60",
  },
  {
    id: "2",
    title: "Workshop tư duy thiết kế",
    description:
      "Học cách áp dụng tư duy thiết kế để giải quyết vấn đề và tạo ra ý tưởng sáng tạo.",
    date: "Thứ Ba, 5 tháng 5",
    time: "13:00 - 16:00",
    location: "Phòng B203",
    seats: "Còn 2/40 chỗ",
    price: "50.000 đ",
    tag: "Thiết kế",
    image: "https://images.unsplash.com/photo-1523978591478-c753949ff840?auto=format&fit=crop&w=1200&q=60",
  },
  {
    id: "3",
    title: "Lộ trình nghề nghiệp trong ngành công nghệ",
    description:
      "Định hướng nghề nghiệp trong ngành công nghệ. Chia sẻ kinh nghiệm từ các chuyên gia hàng đầu.",
    date: "Thứ Tư, 6 tháng 5",
    time: "09:00 - 12:00",
    location: "Hội trường lớn",
    seats: "Còn 44/200 chỗ",
    price: "Miễn phí",
    tag: "Nghề nghiệp",
    image: "https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1200&q=60",
  },
];

export default function Home() {
  const [tab, setTab] = useState<"browse" | "registered">("browse");

  return (
    <div className="grid gap-6">
      <div className="">
        <div className="flex flex-col items-start">
          <div className="inline-flex rounded-full bg-slate-200 p-1 mb-5">
            <button
              onClick={() => setTab("browse")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${tab === "browse"
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-600"
                }`}
            >
              Khám phá Workshop
            </button>

            <button
              onClick={() => setTab("registered")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${tab === "registered"
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-600"
                }`}
            >
              Đã đăng ký (1)
            </button>
          </div>

          <div className="items-center gap-20 flex flex-row justify-between w-full">
            <div className="rounded-full border border-black/10 bg-white/90 px-4 py-2 text-sm shadow-sm flex-1 flex items-center gap-5">
              <FaSearch />
              <input placeholder="Tìm kiếm workshop hoặc diễn giả..." className="outline-none w-full" />
            </div>
            <div className="flex gap-2">
              <button className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm flex items-center gap-2"><FaFilter />Tất cả</button>
              <button className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm flex items-center gap-2"><FaFilter />Công nghệ</button>
              <button className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm flex items-center gap-2"><FaFilter />Thiết kế</button>
              <button className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm flex items-center gap-2"><FaFilter />Nghề nghiệp</button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          {tab === "browse" ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {SAMPLE.map((w) => (
                <WorkshopCard key={w.id} workshop={w} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {SAMPLE.map((item, index) => (
                <RegisteredWorkshopCard
                  key={index}
                  item={item}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
