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
          <h1 className="text-2xl font-semibold">Quản lý Workshops</h1>
          <p className="text-sm text-slate-600">Tạo, sửa, publish hoặc huỷ workshop; quản lý sessions.</p>
        </div>
        <div>
          <a href="/admin/workshops/create" className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">Tạo Workshop</a>
        </div>
      </div>

      <div className="space-y-4">
        {loading && <p>Loading workshops...</p>}
        {!loading && workshops.length === 0 && (
          <div className="rounded-lg border bg-white p-4">Không có workshop được công bố. Bạn vẫn có thể tạo workshop mới.</div>
        )}
        <ul className="space-y-3">
          {workshops.map(w => (
            <li key={w.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <a href={`/admin/workshops/${w.id}`} className="text-lg font-semibold text-slate-900">{w.title}</a>
                  <div className="text-sm text-slate-600">{w.speaker}</div>
                  <div className="mt-2 text-sm text-slate-700">{w.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-700">{w.status}</div>
                  <a href={`/admin/workshops/${w.id}`} className="mt-3 inline-block text-sm text-sky-600">Quản lý</a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
