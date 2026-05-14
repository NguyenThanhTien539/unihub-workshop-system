"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ensureAdminAuth, fetchWithAuth } from "../../../../lib/adminAuth";

type Session = any;

export default function WorkshopEditPage() {
  const params = useParams() as { id?: string } | null;
  const id = params?.id ?? "";
  const [loading, setLoading] = useState(true);
  const [workshop, setWorkshop] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!id || id === 'undefined') { setError('ID workshop không hợp lệ'); setLoading(false); return; }
      const ok = await ensureAdminAuth();
      if (!ok) { window.location.href = '/auth/login?role=organizer'; return; }

      // try sessionStorage (created just now) then fallback to public GET
      const cached = sessionStorage.getItem(`admin:workshop:${id}`);
      if (cached) {
        const data = JSON.parse(cached);
        setWorkshop(data);
        setTitle(data.title ?? "");
        setSpeaker(data.speaker ?? "");
        setDescription(data.description ?? "");
        setLoading(false);
        return;
      }

      try {
        const r = await fetchWithAuth(`/api/admin/workshops/${id}`);
        if (r.ok) {
          const json = await r.json();
          const data = json?.data;
          setWorkshop(data);
          setTitle(data.title ?? "");
          setSpeaker(data.speaker ?? "");
          setDescription(data.description ?? "");
        } else {
          // fallback to public detail if available
          const r2 = await fetchWithAuth(`/api/workshops/${id}`);
          if (r2.ok) {
            const json2 = await r2.json();
            const data = json2?.data;
            setWorkshop(data);
            setTitle(data.title ?? "");
            setSpeaker(data.speaker ?? "");
            setDescription(data.description ?? "");
          } else {
            setError('Không tìm thấy workshop');
          }
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function saveWorkshop(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/admin/workshops/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, speaker, description }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Cập nhật thất bại");
      const data = json?.data;
      setWorkshop(data);
      try { sessionStorage.setItem(`admin:workshop:${id}`, JSON.stringify(data)); } catch { }
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally { setSaving(false); }
  }

  async function publish() {
    setSaving(true); setError(null);
    try {
      const res = await fetchWithAuth(`/api/admin/workshops/${id}/publish`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Xuất bản thất bại");
      setWorkshop(json.data);
      try { sessionStorage.setItem(`admin:workshop:${id}`, JSON.stringify(json.data)); } catch { }
    } catch (err: any) { setError(String(err?.message ?? err)); } finally { setSaving(false); }
  }

  async function cancelWorkshop() {
    if (!confirm("Xác nhận hủy workshop này?")) return;
    setSaving(true); setError(null);
    try {
      const res = await fetchWithAuth(`/api/admin/workshops/${id}/cancel`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Hủy workshop thất bại");
      setWorkshop(json.data);
    } catch (err: any) { setError(String(err?.message ?? err)); } finally { setSaving(false); }
  }

  async function createSession(form: any) {
    setSaving(true); setError(null);
    try {
      function normalizeLocal(v: string) {
        if (!v) return v;
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return v + ':00';
        return v.replace(/\.\d+Z$/, '').replace(/Z$/, '');
      }

      const payload = {
        roomId: form.roomId,
        startAt: normalizeLocal(form.startAt),
        endAt: normalizeLocal(form.endAt),
        seatCapacity: form.seatCapacity,
        feeType: form.feeType,
        feeAmount: form.feeAmount,
        currency: form.currency ?? 'VND'
      };

      const res = await fetchWithAuth(`/api/admin/workshops/${id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Tạo buổi học thất bại");
      // reload admin detail via returned session response + local fetch
      // simplest: reload page
      window.location.reload();
    } catch (err: any) { setError(String(err?.message ?? err)); } finally { setSaving(false); }
  }

  async function updateSession(sessionId: string, form: any) {
    setSaving(true); setError(null);
    try {
      const res = await fetchWithAuth(`/api/admin/sessions/${sessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Cập nhật buổi học thất bại");
      window.location.reload();
    } catch (err: any) { setError(String(err?.message ?? err)); } finally { setSaving(false); }
  }

  async function cancelSession(sessionId: string) {
    if (!confirm("Xác nhận hủy buổi học này?")) return;
    setSaving(true); setError(null);
    try {
      const res = await fetchWithAuth(`/api/admin/sessions/${sessionId}/cancel`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Hủy buổi học thất bại");
      window.location.reload();
    } catch (err: any) { setError(String(err?.message ?? err)); } finally { setSaving(false); }
  }

  if (loading) return <p>Đang tải...</p>;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quản lý workshop</h1>
          <p className="text-sm text-slate-600">ID: {id}</p>
        </div>
        <div className="flex gap-2">
          <a href="/admin/workshops" className="rounded-md border px-3 py-1 text-sm">Quay lại</a>
          <button onClick={publish} className="rounded-md bg-emerald-600 px-3 py-1 text-sm text-white">Xuất bản</button>
          <button onClick={cancelWorkshop} className="rounded-md bg-red-600 px-3 py-1 text-sm text-white">Hủy</button>
        </div>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      <form onSubmit={saveWorkshop} className="space-y-4 max-w-3xl">
        <div>
          <label className="block text-sm font-medium">Tiêu đề</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Diễn giả</label>
          <input value={speaker} onChange={e => setSpeaker(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Mô tả</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" rows={6} />
        </div>

        <div className="flex gap-2">
          <button disabled={saving} type="submit" className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white">{saving ? 'Đang lưu...' : 'Lưu'}</button>
        </div>
      </form>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Buổi học</h2>
        <div className="space-y-4 mt-3">
          {(workshop?.sessions ?? []).map((s: Session) => (
            <div key={s.id} className="rounded-md border bg-white p-3">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">{s.roomName} — {new Date(s.startAt).toLocaleString()} → {new Date(s.endAt).toLocaleString()}</div>
                  <div className="text-sm text-slate-600">Trạng thái: {s.status} — Số chỗ: {s.seatCapacity}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => void updateSession(s.id, { roomId: s.roomId, startAt: s.startAt, endAt: s.endAt, seatCapacity: s.seatCapacity })} className="rounded-md border px-3 py-1 text-sm">Lưu nhanh</button>
                  <button onClick={() => cancelSession(s.id)} className="rounded-md bg-red-600 px-3 py-1 text-sm text-white">Hủy</button>
                </div>
              </div>
            </div>
          ))}

          <CreateSessionForm onCreate={createSession} disabled={saving} />
        </div>
      </div>
    </section>
  );
}

function CreateSessionForm({ onCreate, disabled }: { onCreate: (f: any) => void, disabled?: boolean }) {
  const [roomId, setRoomId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [seatCapacity, setSeatCapacity] = useState(30);
  const [feeType, setFeeType] = useState("FREE");
  const [feeAmount, setFeeAmount] = useState(0);
  const [currency, setCurrency] = useState("VND");
  const [rooms, setRooms] = useState<Array<{ id: string, name: string, building: string, capacity: number, status: string }>>([]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onCreate({ roomId, startAt, endAt, seatCapacity, feeType, feeAmount, currency });
  }

  useEffect(() => {
    (async () => {
      try {
        const r = await fetchWithAuth('/api/admin/rooms');
        if (r.ok) {
          const j = await r.json();
          setRooms(j?.data ?? []);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  return (
    <form onSubmit={submit} className="rounded-md border p-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm">Phòng</label>
          <select value={roomId} onChange={e => setRoomId(e.target.value)} className="mt-1 w-full rounded-md border px-2 py-1">
            <option value="">-- Chọn phòng --</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name} — {r.building} (sức chứa: {r.capacity})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm">Số chỗ</label>
          <input type="number" value={seatCapacity} onChange={e => setSeatCapacity(Number(e.target.value))} className="mt-1 w-full rounded-md border px-2 py-1" />
        </div>
        <div>
          <label className="block text-sm">Bắt đầu</label>
          <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} className="mt-1 w-full rounded-md border px-2 py-1" />
        </div>
        <div>
          <label className="block text-sm">Kết thúc</label>
          <input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} className="mt-1 w-full rounded-md border px-2 py-1" />
        </div>
        <div>
          <label className="block text-sm">Loại phí</label>
          <select value={feeType} onChange={e => setFeeType(e.target.value)} className="mt-1 w-full rounded-md border px-2 py-1">
            <option value="FREE">Miễn phí</option>
            <option value="PAID">Có phí</option>
          </select>
        </div>
        <div>
          <label className="block text-sm">Số tiền</label>
          <input type="number" value={feeAmount} onChange={e => setFeeAmount(Number(e.target.value))} className="mt-1 w-full rounded-md border px-2 py-1" />
        </div>
        <div>
          <label className="block text-sm">Tiền tệ</label>
          <input value={currency} onChange={e => setCurrency(e.target.value)} className="mt-1 w-full rounded-md border px-2 py-1" />
        </div>
      </div>
      <div className="mt-3">
        <button type="submit" disabled={disabled} className="rounded-md bg-sky-600 px-3 py-1 text-sm text-white">Tạo buổi học</button>
      </div>
    </form>
  );
}
