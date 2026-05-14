"use client";
import {useEffect, useState} from "react";
import {ensureAdminAuth, fetchWithAuth} from "../../../lib/adminAuth";

type WorkshopSummary = {
  id: string;
  title: string;
  speaker: string;
  description: string;
  status: string;
  sessions: any[];
};

export default function WorkshopsAdminPage() {
  const [workshops, setWorkshops] = useState<WorkshopSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    (async () => {
      const ok = await ensureAdminAuth();
      if (!ok) {
        window.location.href = '/auth/login?role=organizer';
        return;
      }
      try {
        const r = await fetchWithAuth('/api/workshops?size=100');
        const json = await r.json();
        console.log(json);
        const data = json?.data ?? [];
        setWorkshops(data);
      } catch (e) {
        setWorkshops([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-slate-700">Quản lý workshop</h2>
          <p className="text-sm text-slate-500">Danh sách tất cả workshop trong hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm workshop..."
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          />
          <a href="/admin/workshops/create" className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ Tạo mới</a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-slate-500">Tổng workshop</div>
          <div className="mt-2 text-2xl font-semibold">{workshops.length}</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-slate-500">Đã xuất bản</div>
          <div className="mt-2 text-2xl font-semibold text-green-600">{workshops.filter(w => w.status === 'PUBLISHED').length}</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-slate-500">Nháp</div>
          <div className="mt-2 text-2xl font-semibold text-amber-600">{workshops.filter(w => w.status === 'DRAFT' || w.status === 'NHAP').length}</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-slate-500">Đã hủy</div>
          <div className="mt-2 text-2xl font-semibold text-red-600">{workshops.filter(w => w.status === 'CANCELED' || w.status === 'CANCELLED').length}</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-slate-500">Tổng buổi học</div>
          <div className="mt-2 text-2xl font-semibold text-sky-600">{workshops.reduce((acc, w) => acc + (w.sessions?.length ?? 0), 0)}</div>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-white p-6 shadow">
        {loading && <p>Đang tải workshop...</p>}
        {!loading && workshops.length === 0 && (
          <div className="rounded-lg border bg-white p-4">Không có workshop được công bố. Bạn vẫn có thể tạo workshop mới.</div>
        )}

        <ul className="divide-y">
          {workshops
            .filter(w => !query || w.title.toLowerCase().includes(query.toLowerCase()))
            .map(w => (
              <li key={w.id} className="flex items-center justify-between py-4">
                <div>
                  <a href={`/admin/workshops/${w.id}`} className="text-lg font-semibold text-slate-900">{w.title}</a>
                  <div className="text-sm text-slate-600">Diễn giả: {w.speaker}</div>
                  <div className="mt-2 text-sm text-slate-700">{w.description}</div>
                </div>
                <div className="flex w-56 shrink-0 items-center justify-end gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-700">{w.sessions?.length ?? 0} buổi học</div>
                    <div className="mt-2 text-sm font-medium text-white">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${w.status === 'PUBLISHED' ? 'bg-slate-900' : 'bg-slate-200 text-slate-700'}`}>
                        {w.status === 'PUBLISHED' ? 'Đã xuất bản' : w.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`/admin/workshops/${w.id}`} className="text-sky-600">Xem chi tiết</a>
                  </div>
                </div>
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
}
