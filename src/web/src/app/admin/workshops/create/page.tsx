"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, Trash2 } from "lucide-react";
import { ensureAdminAuth } from "../../../../lib/adminAuth";
import {
  createWorkshop,
  formatMoney,
  formatSessionDate,
  formatSessionTime,
  listRooms,
  toApiDateTime,
  type CreateWorkshopSessionPayload,
  type FeeType,
  type Room,
} from "../../../../lib/workshops";

type SessionDraft = CreateWorkshopSessionPayload;

export default function CreateWorkshopPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [description, setDescription] = useState("");
  const [sessions, setSessions] = useState<SessionDraft[]>([]);
  const [sessionDraft, setSessionDraft] = useState<SessionDraft>(emptySession());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadRooms() {
      const ok = await ensureAdminAuth();
      if (!ok) {
        window.location.href = "/auth/login?role=organizer";
        return;
      }

      try {
        const data = await listRooms();
        if (mounted) {
          setRooms(data);
          setSessionDraft((current) => ({ ...current, roomId: current.roomId || data[0]?.id || "" }));
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Không tải được danh sách phòng");
      }
    }

    void loadRooms();
    return () => {
      mounted = false;
    };
  }, []);

  function addSession() {
    if (!sessionDraft.roomId || !sessionDraft.startAt || !sessionDraft.endAt) {
      setError("Vui lòng chọn phòng, thời gian bắt đầu và thời gian kết thúc.");
      return;
    }

    const payload = normalizeSession(sessionDraft);
    if (new Date(payload.endAt).getTime() <= new Date(payload.startAt).getTime()) {
      setError("Thời gian kết thúc phải sau thời gian bắt đầu.");
      return;
    }

    setSessions((current) => [...current, payload]);
    setSessionDraft({ ...emptySession(), roomId: rooms[0]?.id || "" });
    setError(null);
  }

  function removeSession(index: number) {
    setSessions((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!title.trim() || !speaker.trim() || !description.trim()) {
        throw new Error("Vui lòng nhập đủ tiêu đề, diễn giả và mô tả.");
      }

      const workshop = await createWorkshop({
        title,
        speaker,
        description,
        sessions,
      });
      router.replace(`/admin/workshops/${workshop.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được workshop");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Tạo workshop</h2>
          <p className="mt-1 text-sm text-slate-500">Workshop sẽ được tạo ở trạng thái nháp cho đến khi bạn xuất bản.</p>
        </div>
        <Link href="/admin/workshops" className="w-fit rounded-md border border-slate-200 px-4 py-2 text-sm font-medium">
          Hủy
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-medium text-slate-950">Thông tin cơ bản</h3>
            <div className="mt-5 space-y-4">
              <Field label="Tiêu đề">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="VD: Nền tảng API với Spring Boot"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
                />
              </Field>
              <Field label="Diễn giả">
                <input
                  value={speaker}
                  onChange={(event) => setSpeaker(event.target.value)}
                  placeholder="VD: Thầy Trần Minh Khoa"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
                />
              </Field>
              <Field label="Mô tả">
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Mô tả nội dung, mục tiêu và yêu cầu tham gia"
                  rows={7}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-slate-950">Buổi học</h3>
                <p className="mt-1 text-sm text-slate-500">Thêm một hoặc nhiều lịch học cho workshop.</p>
              </div>
              <button type="button" onClick={addSession} className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white">
                <CalendarPlus size={16} />
                Thêm buổi học
              </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <Field label="Phòng">
                <select
                  value={sessionDraft.roomId}
                  onChange={(event) => setSessionDraft((current) => ({ ...current, roomId: event.target.value }))}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                >
                  <option value="">Chọn phòng</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}, {room.building} - {room.capacity} chỗ
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sức chứa">
                <input
                  type="number"
                  min={1}
                  value={sessionDraft.seatCapacity}
                  onChange={(event) => setSessionDraft((current) => ({ ...current, seatCapacity: Number(event.target.value) }))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none"
                />
              </Field>
              <Field label="Bắt đầu">
                <input
                  type="datetime-local"
                  value={sessionDraft.startAt}
                  onChange={(event) => setSessionDraft((current) => ({ ...current, startAt: event.target.value }))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none"
                />
              </Field>
              <Field label="Kết thúc">
                <input
                  type="datetime-local"
                  value={sessionDraft.endAt}
                  onChange={(event) => setSessionDraft((current) => ({ ...current, endAt: event.target.value }))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none"
                />
              </Field>
              <Field label="Loại phí">
                <select
                  value={sessionDraft.feeType}
                  onChange={(event) => setSessionDraft((current) => ({ ...current, feeType: parseFeeType(event.target.value), feeAmount: 0 }))}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                >
                  <option value="FREE">Miễn phí</option>
                  <option value="PAID">Có phí</option>
                </select>
              </Field>
              {sessionDraft.feeType === "PAID" && (
                <Field label="Số tiền">
                  <input
                    type="number"
                    min={0}
                    value={sessionDraft.feeAmount ?? 0}
                    onChange={(event) => setSessionDraft((current) => ({ ...current, feeAmount: Number(event.target.value) }))}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none"
                  />
                </Field>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-medium text-slate-950">Buổi học đã thêm</h3>
            <div className="mt-4 space-y-3">
              {sessions.length === 0 ? (
                <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Chưa có buổi học nào.</div>
              ) : (
                sessions.map((session, index) => (
                  <div key={`${session.roomId}-${session.startAt}-${index}`} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-950">{formatSessionDate(session.startAt)}</div>
                        <div className="mt-1 text-sm text-slate-600">{formatSessionTime(session.startAt, session.endAt)}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          {session.seatCapacity} chỗ, {formatMoney(session.feeAmount, session.currency ?? "VND")}
                        </div>
                      </div>
                      <button type="button" onClick={() => removeSession(index)} className="rounded-md p-2 text-red-600 hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {submitting ? "Đang tạo..." : "Tạo workshop"}
            </button>
          </section>
        </aside>
      </form>
    </section>
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

function emptySession(): SessionDraft {
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

function normalizeSession(session: SessionDraft): SessionDraft {
  return {
    ...session,
    startAt: toApiDateTime(session.startAt),
    endAt: toApiDateTime(session.endAt),
    feeAmount: session.feeType === "FREE" ? 0 : Number(session.feeAmount ?? 0),
    currency: session.currency || "VND",
  };
}

function parseFeeType(value: string): FeeType {
  return value === "PAID" ? "PAID" : "FREE";
}
