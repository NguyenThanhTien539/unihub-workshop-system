"use client";
import {useEffect, useState} from "react";
import {ensureAdminAuth, fetchWithAuth} from "../../../../lib/adminAuth";

type SessionForm = {
  roomId: string;
  startAt: string;
  endAt: string;
  seatCapacity: number;
  feeType: "FREE" | "PAID";
  feeAmount: number;
};

export default function CreateWorkshopPage() {
  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [description, setDescription] = useState("");
  const [sessions, setSessions] = useState<SessionForm[]>([]);

  const [showAddSession, setShowAddSession] = useState(false);
  const [sRoom, setSRoom] = useState("");
  const [rooms, setRooms] = useState<Array<{id:string,name:string,building:string,capacity:number,status:string}>>([]);
  const [sStart, setSStart] = useState("");
  const [sEnd, setSEnd] = useState("");
  const [sCapacity, setSCapacity] = useState<number>(30);
  const [sFeeType, setSFeeType] = useState<"FREE"|"PAID">("FREE");
  const [sFee, setSFee] = useState<number>(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetSessionForm() {
    setSRoom(""); setSStart(""); setSEnd(""); setSCapacity(30); setSFeeType("FREE"); setSFee(0);
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
        // ignore, rooms dropdown will be empty
      }
    })();
  }, []);

  function addSession() {
    // basic validation
    if (!sRoom || !sStart || !sEnd) {
      setError('Vui lòng nhập đầy đủ thông tin session (phòng, thời gian).');
      return;
    }
    // ensure roomId looks like a UUID
    const uuidRe = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRe.test(sRoom)) {
      setError('roomId không hợp lệ. Vui lòng sử dụng UUID của phòng.');
      return;
    }
    function normalizeLocal(v: string) {
      if (!v) return v;
      // datetime-local inputs are like 2026-05-05T16:22 (no seconds)
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return v + ':00';
      // strip timezone Z and milliseconds if present
      return v.replace(/\.\d+Z$/, '').replace(/Z$/, '');
    }

    const sf: SessionForm = {
      roomId: sRoom,
      startAt: normalizeLocal(sStart),
      endAt: normalizeLocal(sEnd),
      seatCapacity: Number(sCapacity) || 0,
      feeType: sFeeType,
      feeAmount: Number(sFee) || 0,
    };
    setSessions(prev => [...prev, sf]);
    resetSessionForm();
    setShowAddSession(false);
    setError(null);
  }

  function removeSession(idx: number) {
    setSessions(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const ok = await ensureAdminAuth();
      if (!ok) { window.location.href = '/auth/login?role=organizer'; return; }

      // Create workshop first (backend creates sessions when provided,
      // but server also exposes per-workshop session creation. We'll create
      // the workshop, then create each session via POST /api/admin/workshops/{id}/sessions
      const workshopBody = { title, speaker, description, status: 'DRAFT' };

      const res = await fetchWithAuth("/api/admin/workshops", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(workshopBody),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Create workshop failed");
      const data = json?.data;
      const id = data?.id ?? data?.workshopId ?? data?.workshopId;
      if (!id) {
        setError("Không xác định được id workshop vừa tạo");
        return;
      }

      // create sessions one-by-one using the per-workshop sessions API
      for (const s of sessions) {
        const sessionPayload = {
          roomId: s.roomId,
          startAt: s.startAt,
          endAt: s.endAt,
          seatCapacity: s.seatCapacity,
          feeType: s.feeType,
          feeAmount: s.feeAmount,
          currency: 'VND'
        };

        const sr = await fetchWithAuth(`/api/admin/workshops/${id}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionPayload),
        });
        const sjson = await sr.json();
        if (!sr.ok) {
          // If session creation fails, show error and stop further creations
          throw new Error(sjson?.message || 'Create session failed');
        }
      }

      try { sessionStorage.setItem(`admin:workshop:${id}`, JSON.stringify(data)); } catch {}
      window.location.href = `/admin/workshops/${id}`;
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-medium">Thông tin Workshop</h3>
          <p className="mt-1 text-sm text-slate-500">Nhập thông tin cơ bản về workshop</p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Tiêu đề *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: AI & Machine Learning Fundamentals" className="mt-1 w-full rounded-md border px-3 py-2 bg-gray-50" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Diễn giả *</label>
              <input value={speaker} onChange={e => setSpeaker(e.target.value)} placeholder="VD: Dr. Nguyễn Văn A" className="mt-1 w-full rounded-md border px-3 py-2 bg-gray-50" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Mô tả *</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả chi tiết về nội dung workshop..." className="mt-1 w-full rounded-md border px-3 py-2 bg-gray-50" rows={5} />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Sessions</h3>
              <p className="mt-1 text-sm text-slate-500">Thêm các buổi học cho workshop</p>
            </div>
            <div>
              <button type="button" onClick={() => setShowAddSession(v => !v)} className="inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm">+ Thêm session</button>
            </div>
          </div>

          {showAddSession && (
            <div className="mt-4 space-y-3 border-t pt-4">
              <div>
                <label className="block text-sm">Phòng</label>
                <select value={sRoom} onChange={e => setSRoom(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2">
                  <option value="">-- Chọn phòng --</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name} — {r.building} (cap: {r.capacity})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm">Bắt đầu</label>
                <input type="datetime-local" value={sStart} onChange={e => setSStart(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm">Kết thúc</label>
                <input type="datetime-local" value={sEnd} onChange={e => setSEnd(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm">Sức chứa</label>
                  <input type="number" value={sCapacity} onChange={e => setSCapacity(Number(e.target.value))} className="mt-1 w-full rounded-md border px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm">Loại phí</label>
                  <select value={sFeeType} onChange={e => setSFeeType(e.target.value as any)} className="mt-1 w-full rounded-md border px-3 py-2">
                    <option value="FREE">FREE</option>
                    <option value="PAID">PAID</option>
                  </select>
                </div>
              </div>
              {sFeeType === 'PAID' && (
                <div>
                  <label className="block text-sm">Số tiền</label>
                  <input type="number" value={sFee} onChange={e => setSFee(Number(e.target.value))} className="mt-1 w-full rounded-md border px-3 py-2" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <button type="button" onClick={addSession} className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white">Thêm</button>
                <button type="button" onClick={() => { resetSessionForm(); setShowAddSession(false); }} className="rounded-md border px-4 py-2 text-sm">Hủy</button>
              </div>
            </div>
          )}

          <div className="mt-6">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center text-slate-400">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="opacity-60"><path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <div className="text-sm font-medium">Chưa có session nào</div>
                <div className="text-xs">Nhấn "Thêm session" để bắt đầu</div>
              </div>
            ) : (
              <ul className="space-y-3">
                {sessions.map((s, i) => (
                  <li key={i} className="flex items-center justify-between rounded-md border px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold">{new Date(s.startAt).toLocaleString()} — {new Date(s.endAt).toLocaleString()}</div>
                      <div className="text-xs text-slate-600">Phòng: {s.roomId} • Sức chứa: {s.seatCapacity} • {s.feeType}{s.feeType==='PAID'?` • ${s.feeAmount}`:''}</div>
                    </div>
                    <div>
                      <button type="button" onClick={() => removeSession(i)} className="text-sm text-red-600">Xóa</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <a href="/admin/workshops" className="inline-flex items-center rounded-md border px-4 py-2 text-sm">Hủy</a>
        <button onClick={handleSubmit} disabled={submitting} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">{submitting ? 'Đang tạo...' : 'Tạo workshop'}</button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
    </section>
  );
}
