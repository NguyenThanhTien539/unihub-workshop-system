"use client"

import {
  Calendar, Clock, MapPin, Users,
  CheckCircle2, ArrowLeft, HelpCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { OverallSection } from './components/OverallSection';
import ContentSection from './components/ContentSection';
import AuthorSection from './components/AuthorSection';

const WorkshopDetail = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'content', label: 'Nội dung' },
    { id: 'author', label: 'Diễn giả' },
  ];

  // Hàm render nội dung tương ứng với Tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <div className="animate-in fade-in duration-300"> <OverallSection /> </div>;
      case 'content':
        return <div className="animate-in fade-in duration-300">  <ContentSection /> </div>;
      case 'author':
        return <div className="animate-in fade-in duration-300">  <AuthorSection />  </div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Hero Section */}
      <div className="relative h-[400px] w-full overflow-hidden">
        <button
          onClick={() => {
            router.push("/");
          }}
          className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-lg bg-black/40 px-3 py-2 text-sm text-white backdrop-blur hover:bg-black/60 transition">
          <ArrowLeft size={18} />
          Quay lại
        </button>
        <img
          src="https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=2070&auto=format&fit=crop"
          className="w-full h-full object-cover brightness-50"
          alt="Nền AI"
        />
        <div className="absolute inset-0 flex flex-col justify-end p-12 bg-gradient-to-t from-black/60 to-transparent">
          <div className="max-w-7xl mx-auto w-full">
            <span className="bg-white text-black px-3 py-1 rounded-full text-xs font-semibold mb-4 inline-block">
              Công nghệ
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Nền tảng AI và học máy
            </h1>
            <div className="flex flex-wrap gap-6 text-white/90 text-sm">
              <div className="flex items-center gap-2"><Calendar size={18} /> Thứ Ba, 5 tháng 5</div>
              <div className="flex items-center gap-2"><Clock size={18} /> 09:00 - 11:00</div>
              <div className="flex items-center gap-2"><MapPin size={18} /> Phòng A101</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 relative">

        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          <div className="min-h-[400px]">
            <div className="flex bg-gray-200/50 p-1 rounded-xl w-full mb-5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {renderTabContent()}
          </div>

          {/* Related Workshops */}
          <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-bold mb-2">Workshop liên quan</h2>
            <p className="text-gray-400 text-sm mb-6">Các workshop khác bạn có thể quan tâm</p>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { title: 'Phát triển ứng dụng di động với React Native', date: '6/5/2026', img: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400' },
                { title: 'Kiến thức cơ bản về blockchain và tiền mã hóa', date: '7/5/2026', img: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400' }
              ].map((ws, i) => (
                <div key={i} className="border border-gray-100 rounded-xl overflow-hidden group cursor-pointer hover:shadow-md transition">
                  <img src={ws.img} className="w-full h-32 object-cover" alt={ws.title} />
                  <div className="p-4">
                    <h4 className="font-bold text-sm mb-1 group-hover:text-blue-600 transition">{ws.title}</h4>
                    <p className="text-xs text-gray-400">{ws.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 sticky top-6 self-start">
          {/* Registration Status */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center">
            <h3 className="font-bold text-left mb-8">Đăng ký tham dự</h3>
            <div className="flex flex-col items-center py-4">
              <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={40} />
              </div>
              <p className="text-green-600 font-bold text-lg">Đã đăng ký</p>
              <p className="text-gray-400 text-sm mt-2">Kiểm tra mã QR trong mục "Đã đăng ký"</p>
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold mb-6">Thông tin nhanh</h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="text-blue-500"><Calendar size={20} /></div>
                <div>
                  <p className="text-sm font-bold">Ngày tổ chức</p>
                  <p className="text-sm text-gray-500">Thứ Ba, 5 tháng 5, 2026</p>
                </div>
              </div>
              <div className="flex gap-4 border-t pt-6">
                <div className="text-blue-500"><Clock size={20} /></div>
                <div>
                  <p className="text-sm font-bold">Thời gian</p>
                  <p className="text-sm text-gray-500">09:00 - 11:00</p>
                  <p className="text-xs text-gray-400">Thời lượng: 2 giờ</p>
                </div>
              </div>
              <div className="flex gap-4 border-t pt-6">
                <div className="text-blue-500"><MapPin size={20} /></div>
                <div>
                  <p className="text-sm font-bold">Địa điểm</p>
                  <p className="text-sm text-gray-500">Phòng A101</p>
                  <p className="text-xs text-gray-400">Trường Đại học A</p>
                </div>
              </div>
              <div className="flex gap-4 border-t pt-6">
                <div className="text-blue-500"><Users size={20} /></div>
                <div>
                  <p className="text-sm font-bold">Quy mô</p>
                  <p className="text-sm text-gray-500">60 người</p>
                  <p className="text-xs text-gray-400 text-blue-500">45 người đã đăng ký</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Help Button */}
      <div className="fixed bottom-6 right-6">
        <button className="w-12 h-12 bg-white shadow-lg rounded-full flex items-center justify-center border border-gray-100 hover:bg-gray-50 transition text-gray-400">
          <HelpCircle size={24} />
        </button>
      </div>
    </div>
  );
};

export default WorkshopDetail;
