"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Ban,
  CalendarPlus,
  CheckCircle2,
  Save,
  Trash2,
} from "lucide-react";
import { ensureAdminAuth } from "../../../../lib/adminAuth";
import {
  cancelWorkshop,
  cancelWorkshopSession,
  createWorkshopSession,
  formatLocation,
  formatMoney,
  formatSeatSummary,
  formatSessionDate,
  formatSessionTime,
  getAdminWorkshop,
  listRooms,
  publishWorkshop,
  statusLabel,
  toApiDateTime,
  toDateTimeInputValue,
  updateWorkshop,
  updateWorkshopSession,
  type FeeType,
  type Room,
  type WorkshopDetail,
  type WorkshopSession,
} from "../../../../lib/workshops";

type SessionForm = {
  roomId: string;
  startAt: string;
  endAt: string;
  seatCapacity: number;
  feeType: FeeType;
  feeAmount: number;
  currency: string;
};

export default function WorkshopEditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const [workshop, setWorkshop] = useState<WorkshopDetail | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [description, setDescription] = useState("");
  const [newSession, setNewSession] = useState<SessionForm>(emptySession());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const ok = await ensureAdminAuth();
      if (!ok) {
        window.location.href = "/auth/login?role=organizer";
        return;
      }

      try {
        const [detail, roomData] = await Promise.all([getAdminWorkshop(id), listRooms()]);
        if (!mounted) return;
        setWorkshop(detail);
        setRooms(roomData);
        setTitle(detail.title);
        setSpeaker(detail.speaker);
        setDescription(detail.description);
        setNewSession({ ...emptySession(), roomId: roomData[0]?.id || "" });
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Không tải được workshop");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [id]);

  async function reloadWorkshop() {
    const detail = await getAdminWorkshop(id);
    setWorkshop(detail);
    setTitle(detail.title);
    setSpeaker(detail.speaker);
    setDescription(detail.description);
    return detail;
  }

  async function handleSaveWorkshop(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const detail = await updateWorkshop(id, { title, speaker, description });
      setWorkshop(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được workshop");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setSaving(true);
    setError(null);

    try {
      const detail = await publishWorkshop(id);
      setWorkshop(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xuất bản được workshop");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelWorkshop() {
    if (!window.confirm("Hủy workshop này và tất cả session đang hoạt động?")) return;
    setSaving(true);
    setError(null);

    try {
      const detail = await cancelWorkshop(id);
      setWorkshop(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không hủy được workshop");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateSession(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await createWorkshopSession(id, normalizeSession(newSession));
      await reloadWorkshop();
      setNewSession({ ...emptySession(), roomId: rooms[0]?.id || "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được session");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateSession(sessionId: string, form: SessionForm) {
    setSaving(true);
    setError(null);

    try {
      await updateWorkshopSession(sessionId, normalizeSession(form));
      await reloadWorkshop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được session");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelSession(sessionId: string) {
    if (!window.confirm("Hủy session này?")) return;
    setSaving(true);
    setError(null);

    try {
      await cancelWorkshopSession(sessionId);
      await reloadWorkshop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không hủy được session");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="min-h-96 animate-pulse rounded-lg bg-white" />;
  }

  if (!workshop) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error ?? "Không tìm thấy workshop."}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link href="/admin/workshops" className="text-sm font-medium text-sky-700 hover:text-sky-900">
            Quay lại danh sách
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-slate-950">{workshop.title}</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {statusLabel(workshop.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">ID: {workshop.id}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePublish}
            disabled={saving || workshop.status !== "DRAFT"}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <CheckCircle2 size={16} />
            Xuất bản
          </button>
          <button
            type="button"
            onClick={handleCancelWorkshop}
            disabled={saving || workshop.status === "CANCELED"}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Ban size={16} />
            Hủy workshop
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <form onSubmit={handleSaveWorkshop} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-medium text-slate-950">Thông tin workshop</h3>
            <div className="mt-5 space-y-4">
              <Field label="Tiêu đề">
                <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none" />
              </Field>
              <Field label="Diễn giả">
                <input value={speaker} onChange={(event) => setSpeaker(event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none" />
              </Field>
              <Field label="Mô tả">
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={6} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none" />
              </Field>
            </div>
            <button
              type="submit"
              disabled={saving || workshop.status === "CANCELED"}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
            >
              <Save size={16} />
              Lưu thông tin
            </button>
          </form>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-medium text-slate-950">Session hiện có</h3>
            <div className="mt-4 space-y-4">
              {workshop.sessions.length > 0 ? (
                workshop.sessions.map((session) => (
                  <SessionEditor
                    key={`${session.id}:${session.roomId}:${session.startAt}:${session.endAt}:${session.seatCapacity}:${session.feeType}:${session.feeAmount}:${session.status}`}
                    session={session}
                    rooms={rooms}
                    disabled={saving || workshop.status === "CANCELED"}
                    onSave={(form) => handleUpdateSession(session.id, form)}
                    onCancel={() => handleCancelSession(session.id)}
                  />
                ))
              ) : (
                <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Workshop chưa có session.</div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-medium text-slate-950">Thêm session</h3>
            <form onSubmit={handleCreateSession} className="mt-5 space-y-4">
              <SessionFormFields form={newSession} rooms={rooms} onChange={setNewSession} />
              <button
                type="submit"
                disabled={saving || workshop.status === "CANCELED"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-slate-300"
              >
                <CalendarPlus size={16} />
                Thêm session
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-medium text-slate-950">Tóm tắt</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div>Tổng session: {workshop.sessions.length}</div>
              <div>Session mở: {workshop.sessions.filter((item) => item.status === "OPEN").length}</div>
              <div>Tổng chỗ còn lại: {workshop.sessions.reduce((total, item) => total + item.remainingSeats, 0)}</div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function SessionEditor({
  session,
  rooms,
  disabled,
  onSave,
  onCancel,
}: {
  session: WorkshopSession;
  rooms: Room[];
  disabled: boolean;
  onSave: (form: SessionForm) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<SessionForm>(() => ({
    roomId: session.roomId,
    startAt: toDateTimeInputValue(session.startAt),
    endAt: toDateTimeInputValue(session.endAt),
    seatCapacity: session.seatCapacity,
    feeType: session.feeType,
    feeAmount: Number(session.feeAmount ?? 0),
    currency: session.currency || "VND",
  }));

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="font-medium text-slate-950">{formatSessionDate(session.startAt)}</div>
          <div className="mt-1 text-sm text-slate-500">
            {formatSessionTime(session.startAt, session.endAt)} tại {formatLocation(session)}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {formatSeatSummary(session)}, {formatMoney(Number(session.feeAmount), session.currency)}
          </div>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {statusLabel(session.status)}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SessionFormFields form={form} rooms={rooms} onChange={setForm} compact />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={disabled || session.status === "CANCELED"}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-300"
        >
          <Save size={16} />
          Lưu session
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled || session.status === "CANCELED"}
          className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:text-slate-400"
        >
          <Trash2 size={16} />
          Hủy session
        </button>
      </div>
    </div>
  );
}

function SessionFormFields({
  form,
  rooms,
  onChange,
  compact = false,
}: {
  form: SessionForm;
  rooms: Room[];
  onChange: React.Dispatch<React.SetStateAction<SessionForm>>;
  compact?: boolean;
}) {
  return (
    <>
      <Field label="Phòng">
        <select value={form.roomId} onChange={(event) => onChange((current) => ({ ...current, roomId: event.target.value }))} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none">
          <option value="">Chọn phòng</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}, {room.building} - {room.capacity} chỗ
            </option>
          ))}
        </select>
      </Field>
      <Field label="Sức chứa">
        <input type="number" min={1} value={form.seatCapacity} onChange={(event) => onChange((current) => ({ ...current, seatCapacity: Number(event.target.value) }))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none" />
      </Field>
      <Field label="Bắt đầu">
        <input type="datetime-local" value={form.startAt} onChange={(event) => onChange((current) => ({ ...current, startAt: event.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none" />
      </Field>
      <Field label="Kết thúc">
        <input type="datetime-local" value={form.endAt} onChange={(event) => onChange((current) => ({ ...current, endAt: event.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none" />
      </Field>
      <Field label="Loại phí">
        <select value={form.feeType} onChange={(event) => onChange((current) => ({ ...current, feeType: parseFeeType(event.target.value), feeAmount: 0 }))} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none">
          <option value="FREE">Miễn phí</option>
          <option value="PAID">Có phí</option>
        </select>
      </Field>
      {form.feeType === "PAID" && (
        <Field label="Số tiền">
          <input type="number" min={0} value={form.feeAmount} onChange={(event) => onChange((current) => ({ ...current, feeAmount: Number(event.target.value) }))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none" />
        </Field>
      )}
      {!compact && <div />}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function emptySession(): SessionForm {
  return {
    roomId: "",
    startAt: "",
    endAt: "",
    seatCapacity: 30,
    feeType: "FREE",
    feeAmount: 0,
    currency: "VND",
  };
}

function normalizeSession(session: SessionForm) {
  return {
    ...session,
    startAt: toApiDateTime(session.startAt),
    endAt: toApiDateTime(session.endAt),
    feeAmount: session.feeType === "FREE" ? 0 : Number(session.feeAmount),
    currency: session.currency || "VND",
  };
}

function parseFeeType(value: string): FeeType {
  return value === "PAID" ? "PAID" : "FREE";
}
