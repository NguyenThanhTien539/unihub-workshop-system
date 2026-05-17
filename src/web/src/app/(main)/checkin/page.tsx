"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle, TriangleAlert, XCircle } from "lucide-react";
import Link from "next/link";
import { getFriendlyErrorMessage } from "../../../lib/apiClient";
import { getCurrentUser, hasStoredSession, normalizeRoles } from "../../../lib/auth";
import { listCheckinSessions, validateCheckin, type CheckinSession, type CheckinValidateResponse } from "../../../lib/checkin";
import { formatDateTime, formatSessionDate, formatSessionTime } from "../../../lib/workshops";
import Button from "../../../components/Button";

type Notice = {
  tone: "success" | "error" | "info";
  message: string;
};

export default function CheckinPage() {
  const [sessions, setSessions] = useState<CheckinSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [result, setResult] = useState<CheckinValidateResponse | null>(null);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.sessionId === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );

  useEffect(() => {
    void loadSessions();
  }, []);

  async function loadSessions() {
    setLoading(true);
    setError(null);

    try {
      if (!hasStoredSession()) {
        setAllowed(false);
        return;
      }

      const user = await getCurrentUser();
      const canCheckin = normalizeRoles(user.roles).includes("checkin_staff");
      setAllowed(canCheckin);

      if (!canCheckin) {
        return;
      }

      const response = await listCheckinSessions();
      setSessions(response);
      setSelectedSessionId((current) => current || response[0]?.sessionId || "");
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Không tải được danh sách buổi check-in."));
    } finally {
      setLoading(false);
    }
  }

  async function handleValidate(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedSessionId || !qrToken.trim()) return;

    setSubmitting(true);
    setNotice(null);

    try {
      const response = await validateCheckin({
        sessionId: selectedSessionId,
        qrToken: qrToken.trim(),
        scannedAt: new Date().toISOString().slice(0, 19),
      });
      setResult(response);

      if (response.result === "ACCEPTED") {
        setNotice({
          tone: "success",
          message: "Check-in thành công. Sẵn sàng quét mã tiếp theo.",
        });
      } else {
        setNotice({
          tone: "info",
          message: "Mã này đã được check-in trước đó.",
        });
      }
    } catch (err) {
      setResult(null);
      setNotice({
        tone: "error",
        message: getFriendlyErrorMessage(err, "Không xác thực được mã QR."),
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="min-h-[360px] animate-pulse rounded-3xl bg-white shadow-sm" />;
  }

  if (!allowed) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">Quầy check-in</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Trang này chỉ dành cho tài khoản nhân sự check-in.
        </p>
        <Link
          href="/auth/login?role=checkin"
          className="mt-5 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Đăng nhập nhân sự check-in
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Quầy check-in</h1>
            <p className="mt-1 text-sm text-slate-500">
              Nhập mã QR thủ công để xác thực lượt tham dự của sinh viên.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadSessions()}
            className="inline-flex w-fit rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Làm mới buổi học
          </button>
        </div>
      </div>

      {error ? <NoticeBanner notice={{ tone: "error", message: error }} /> : null}
      {notice ? <NoticeBanner notice={notice} /> : null}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Buổi học khả dụng</h2>
          <div className="mt-4 space-y-3">
            {sessions.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Không có buổi học nào khả dụng để check-in.</div>
            ) : (
              sessions.map((session) => {
                const active = session.sessionId === selectedSessionId;
                return (
                  <button
                    key={session.sessionId}
                    type="button"
                    onClick={() => setSelectedSessionId(session.sessionId)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active ? "border-sky-500 bg-sky-50" : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-medium text-slate-950">{session.workshopTitle}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {formatSessionDate(session.startAt)} · {formatSessionTime(session.startAt, session.endAt)}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {session.roomName}, {session.building}
                    </div>
                    <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {session.checkinOpen ? "ĐANG MỞ CHECK-IN" : "ĐÃ ĐÓNG CHECK-IN"}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Xác thực mã QR</h2>
          <form className="mt-5 space-y-4" onSubmit={handleValidate}>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Buổi học</span>
              <select
                value={selectedSessionId}
                onChange={(event) => setSelectedSessionId(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
              >
                <option value="">Chọn buổi học</option>
                {sessions.map((session) => (
                  <option key={session.sessionId} value={session.sessionId}>
                    {session.workshopTitle} · {session.roomName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Mã QR</span>
              <textarea
                value={qrToken}
                onChange={(event) => setQrToken(event.target.value)}
                rows={5}
                className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none"
                placeholder="Dán mã QR vào đây để xác thực thủ công."
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={submitting || !selectedSessionId || !qrToken.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400"
              >
                {submitting ? <LoaderCircle size={16} className="animate-spin" /> : null}
                {submitting ? "Đang xác thực..." : "Xác thực check-in"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setQrToken("");
                  setResult(null);
                  setNotice(null);
                }}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Quét tiếp
              </button>
            </div>
          </form>

          {selectedSession ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <div className="font-medium text-slate-950">{selectedSession.workshopTitle}</div>
              <div className="mt-1">
                {selectedSession.roomName}, {selectedSession.building}
              </div>
              <div className="mt-1">
                {formatSessionDate(selectedSession.startAt)} · {formatSessionTime(selectedSession.startAt, selectedSession.endAt)}
              </div>
            </div>
          ) : null}

          {result ? <ResultCard result={result} /> : null}
        </section>
      </div>
    </section>
  );
}

function ResultCard({ result }: { result: CheckinValidateResponse }) {
  const accepted = result.result === "ACCEPTED";

  return (
    <div
      className={`mt-6 rounded-3xl border p-5 ${
        accepted ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex items-start gap-3">
        {accepted ? (
          <CheckCircle2 className="mt-0.5 text-emerald-600" />
        ) : (
          <TriangleAlert className="mt-0.5 text-amber-600" />
        )}
        <div>
          <div className={`text-lg font-semibold ${accepted ? "text-emerald-800" : "text-amber-800"}`}>
            {result.result === "ACCEPTED" ? "Đã chấp nhận" : "Trùng lượt check-in"}
          </div>
          <div className="mt-1 text-sm text-slate-700">
            {result.studentName} · {result.studentId}
          </div>
          {result.checkedInAt ? (
            <div className="mt-2 text-sm text-slate-600">Check-in lúc: {formatDateTime(result.checkedInAt)}</div>
          ) : null}
          {result.previousCheckedInAt ? (
            <div className="mt-2 text-sm text-slate-600">
              Lần check-in trước: {formatDateTime(result.previousCheckedInAt)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function NoticeBanner({ notice }: { notice: Notice }) {
  const toneClass =
    notice.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : notice.tone === "error"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-sky-200 bg-sky-50 text-sky-700";

  const icon =
    notice.tone === "success" ? (
      <CheckCircle2 size={18} />
    ) : notice.tone === "error" ? (
      <XCircle size={18} />
    ) : (
      <TriangleAlert size={18} />
    );

  return (
    <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${toneClass}`}>
      {icon}
      <span>{notice.message}</span>
    </div>
  );
}
