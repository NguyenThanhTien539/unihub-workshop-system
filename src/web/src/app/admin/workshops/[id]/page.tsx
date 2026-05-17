"use client";

import { use, useEffect, useState } from "react";
import type React from "react";
import { toast } from "sonner";
import Button from "../../../../components/Button";
import {
  Ban,
  CalendarPlus,
  CheckCircle2,
  RefreshCw,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { ensureAdminAuth } from "../../../../lib/adminAuth";
import { getFriendlyErrorMessage } from "../../../../lib/apiClient";
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
  getDocumentSummaryStatus,
  getWorkshopStats,
  getWorkshopSummary,
  listRooms,
  publishWorkshop,
  statusLabel,
  toApiDateTime,
  toDateTimeInputValue,
  updateWorkshop,
  updateWorkshopSession,
  uploadWorkshopDocument,
  type DocumentSummaryStatusResponse,
  type FeeType,
  type Room,
  type UploadWorkshopDocumentResponse,
  type WorkshopAiSummaryResponse,
  type WorkshopDetail,
  type WorkshopSession,
  type WorkshopStats,
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

type AdminNotice = {
  tone: "success" | "warning" | "error" | "info";
  message: string;
};

type InitialAiSummaryNotice = {
  notice: AdminNotice | null;
  summaryStatus: DocumentSummaryStatusResponse | null;
};

export default function WorkshopEditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const [initialAiSummaryNotice] = useState<InitialAiSummaryNotice>(() => readAdminWorkshopNotice(id));
  const [workshop, setWorkshop] = useState<WorkshopDetail | null>(null);
  const [stats, setStats] = useState<WorkshopStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [description, setDescription] = useState("");
  const [newSession, setNewSession] = useState<SessionForm>(emptySession());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [refreshingSummaryStatus, setRefreshingSummaryStatus] = useState(false);
  const [summaryStatus, setSummaryStatus] = useState<DocumentSummaryStatusResponse | null>(
    initialAiSummaryNotice.summaryStatus,
  );
  const [aiSummary, setAiSummary] = useState<WorkshopAiSummaryResponse | null>(null);

  useEffect(() => {
    if (!initialAiSummaryNotice.notice) return;
    const message = initialAiSummaryNotice.notice.message;
    if (initialAiSummaryNotice.notice.tone === "success") toast.success(message);
    else if (initialAiSummaryNotice.notice.tone === "warning") toast.warning(message);
    else if (initialAiSummaryNotice.notice.tone === "error") toast.error(message);
    else toast.info(message);
  }, [initialAiSummaryNotice.notice]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const ok = await ensureAdminAuth();
      if (!ok) {
        window.location.href = "/auth/login?role=organizer";
        return;
      }

      try {
        const [detail, roomData, statsData, latestSummary] = await Promise.all([
          getAdminWorkshop(id),
          listRooms(),
          getWorkshopStats(id).catch(() => null),
          getWorkshopSummary(id).catch(() => null),
        ]);
        if (!mounted) return;
        setWorkshop(detail);
        setRooms(roomData);
        setStats(statsData);
        setStatsError(statsData ? null : "Không thể tải thống kê. Vui lòng thử lại.");
        setTitle(detail.title);
        setSpeaker(detail.speaker);
        setDescription(detail.description);
        setAiSummary(latestSummary);
        setNewSession({ ...emptySession(), roomId: roomData[0]?.id || "" });
      } catch (err) {
        if (mounted) setError(getFriendlyErrorMessage(err, "Không thể tải workshop."));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!summaryStatus?.documentId || isTerminalSummaryStatus(summaryStatus.summaryStatus)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshAiStatus(summaryStatus.documentId, false);
    }, 4000);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryStatus?.documentId, summaryStatus?.summaryStatus]);

  async function reloadWorkshop() {
    const [detail, statsData] = await Promise.all([
      getAdminWorkshop(id),
      getWorkshopStats(id).catch(() => null),
    ]);
    setWorkshop(detail);
    setStats(statsData);
    setStatsError(statsData ? null : "Không thể tải thống kê. Vui lòng thử lại.");
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
      await reloadWorkshop();
      toast.success("Đã lưu thay đổi.");
      toast.message("Sinh viên đã đăng ký sẽ nhận được thông báo nếu thông tin tham dự thay đổi.");
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "Không thể cập nhật workshop. Vui lòng thử lại.");
      setError(message);
      toast.error(message);
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
      toast.success("Đã công bố workshop.");
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "Không thể công bố workshop. Vui lòng thử lại.");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelWorkshop() {
    if (!window.confirm("Hủy workshop này và các buổi đang hoạt động?")) return;
    setSaving(true);
    setError(null);

    try {
      const detail = await cancelWorkshop(id);
      setWorkshop(detail);
      await reloadWorkshop();
      toast.success("Đã hủy workshop.");
      toast.message("Sinh viên đã đăng ký sẽ nhận được thông báo hủy.");
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "Không thể hủy workshop. Vui lòng thử lại.");
      setError(message);
      toast.error(message);
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
      toast.success("Đã tạo buổi workshop.");
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "Không thể tạo buổi workshop. Vui lòng thử lại.");
      setError(message);
      toast.error(message);
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
      toast.success("Đã cập nhật buổi workshop.");
      toast.message("Sinh viên đã đăng ký sẽ nhận được thông báo nếu thông tin tham dự thay đổi.");
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "Không thể cập nhật buổi workshop. Vui lòng thử lại.");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelSession(sessionId: string) {
    if (!window.confirm("Hủy buổi workshop này?")) return;
    setSaving(true);
    setError(null);

    try {
      await cancelWorkshopSession(sessionId);
      await reloadWorkshop();
      toast.success("Đã hủy buổi workshop.");
      toast.message("Sinh viên đã đăng ký sẽ nhận được thông báo hủy.");
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "Không thể hủy buổi workshop. Vui lòng thử lại.");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function onPdfChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setPdfError("File phải là PDF.");
      setPdfFile(null);
      return;
    }
    setPdfFile(file);
    setPdfError(null);
  }

  async function handleUploadPdf() {
    if (!pdfFile) {
      setPdfError("Vui lòng chọn file PDF.");
      return;
    }

    setUploadingPdf(true);
    setPdfError(null);

    try {
      const uploadResult = await uploadWorkshopDocument(id, pdfFile);
      setPdfFile(null);
      setSummaryStatus({
        ...uploadResult,
        updatedAt: new Date().toISOString(),
      });
      setAiSummary({
        workshopId: id,
        documentId: uploadResult.documentId,
        summaryStatus: uploadResult.summaryStatus,
        summaryText: null,
        generatedAt: null,
        errorCode: null,
      });
      toast.success("Tài liệu đã được tải lên. Hệ thống đang tạo tóm tắt.");
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "Không thể tải PDF lên. Vui lòng thử lại.");
      setPdfError(message);
      toast.error(message);
    } finally {
      setUploadingPdf(false);
    }
  }

  async function refreshAiStatus(documentId = summaryStatus?.documentId, showSpinner = true) {
    if (!documentId) return;

    if (showSpinner) {
      setRefreshingSummaryStatus(true);
    }
    try {
      const status = await getDocumentSummaryStatus(documentId);
      setSummaryStatus(status);
      if (status.summaryStatus === "COMPLETED") {
        await loadLatestAiSummary();
      } else {
        setAiSummary((current) => ({
          workshopId: status.workshopId,
          documentId: status.documentId,
          summaryStatus: status.summaryStatus,
          summaryText: null,
          generatedAt: null,
          errorCode: status.summaryStatus === "FAILED" ? "AI_SUMMARY_FAILED" : current?.errorCode ?? null,
        }));
      }
    } catch (err) {
      setPdfError(getFriendlyErrorMessage(err, "Không thể cập nhật trạng thái tóm tắt."));
    } finally {
      if (showSpinner) {
        setRefreshingSummaryStatus(false);
      }
    }
  }

  async function loadLatestAiSummary() {
    try {
      setAiSummary(await getWorkshopSummary(id));
    } catch {
      setAiSummary(null);
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
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-slate-950">{workshop.title}</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {statusLabel(workshop.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Quản lý lịch, phòng học và tài liệu tóm tắt.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button href="/admin/workshops" className="text-sm font-medium px-4">
            Quay lại danh sách
          </Button>
          <Button
            type="button"
            onClick={handlePublish}
            disabled={saving || workshop.status !== "DRAFT"}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <CheckCircle2 size={16} />
            Công bố
          </Button>
          <Button
            type="button"
            onClick={handleCancelWorkshop}
            disabled={saving || workshop.status === "CANCELED"}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Ban size={16} />
            Hủy workshop
          </Button>
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
            <Button
              type="submit"
              disabled={saving || workshop.status === "CANCELED"}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
            >
              <Save size={16} />
              Lưu thông tin
            </Button>
          </form>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-medium text-slate-950">Buổi workshop hiện có</h3>
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
                <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Workshop chưa có buổi nào.</div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <StatsPanel stats={stats} error={statsError} />

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-medium text-slate-950">Thêm buổi workshop</h3>
            <form onSubmit={handleCreateSession} className="mt-5 space-y-4">
              <SessionFormFields form={newSession} rooms={rooms} onChange={setNewSession} />
              <Button
                type="submit"
                disabled={saving || workshop.status === "CANCELED"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-slate-300"
              >
                <CalendarPlus size={16} />
                Thêm buổi workshop
              </Button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-medium text-slate-950">Tóm tắt tự động từ PDF</h3>
            <div className="mt-4 space-y-4">
              <div className="flex flex-col gap-3">
                <input id={`summary-pdf-${id}`} type="file" accept="application/pdf" onChange={onPdfChange} className="hidden" />
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor={`summary-pdf-${id}`} className="inline-flex cursor-pointer items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Chọn PDF
                  </label>
                  <Button
                    type="button"
                    onClick={handleUploadPdf}
                    disabled={uploadingPdf || !pdfFile || workshop.status === "CANCELED"}
                    className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:bg-slate-300"
                  >
                    <Upload size={16} />
                    {uploadingPdf ? "Đang tải lên..." : "Tải PDF lên"}
                  </Button>
                </div>
                <div className="text-sm text-slate-600">
                  {pdfFile ? `Đã chọn: ${pdfFile.name}` : "Chọn file PDF để hệ thống tự tạo tóm tắt cho sinh viên."}
                </div>
                {pdfError ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{pdfError}</div> : null}
              </div>

              {summaryStatus ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="space-y-2">
                    <div><span className="font-medium text-slate-950">Tài liệu:</span> {uploadStatusLabel(summaryStatus.uploadStatus)}</div>
                    <div><span className="font-medium text-slate-950">Trạng thái:</span> {aiStatusLabel(summaryStatus.summaryStatus)}</div>
                    <div><span className="font-medium text-slate-950">Cập nhật:</span> {formatAdminDateTime(summaryStatus.updatedAt)}</div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => void refreshAiStatus()}
                    disabled={refreshingSummaryStatus}
                    className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <RefreshCw size={16} className={refreshingSummaryStatus ? "animate-spin" : ""} />
                    Làm mới
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                  Chưa có tài liệu tóm tắt cho workshop này.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-medium text-slate-950">Tóm tắt</h3>
            <div className="mt-4 text-sm leading-6 text-slate-700">
              {renderAiSummary(aiSummary)}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function StatsPanel({ stats, error }: { stats: WorkshopStats | null; error: string | null }) {
  if (error) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        {error}
      </section>
    );
  }

  if (!stats) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-medium text-slate-950">Thống kê đăng ký</h3>
        <div className="mt-4 h-24 animate-pulse rounded-md bg-slate-100" />
      </section>
    );
  }

  const attendanceRate = stats.confirmedCount > 0
    ? Math.round((stats.checkedInCount / stats.confirmedCount) * 100)
    : 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-medium text-slate-950">Thống kê đăng ký</h3>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatValue label="Tổng số chỗ" value={stats.totalCapacity} />
        <StatValue label="Đã đăng ký" value={stats.confirmedCount} />
        <StatValue label="Đang giữ chỗ" value={stats.reservedCount} />
        <StatValue label="Đã check-in" value={stats.checkedInCount} />
        <StatValue label="Còn trống" value={stats.remainingSeats} />
        <StatValue label="Tỷ lệ tham dự" value={`${attendanceRate}%`} />
      </div>
      <div className="mt-5 space-y-3">
        {stats.sessions.map((session) => (
          <div key={session.sessionId} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-slate-950">{formatSessionDate(session.startAt)}</div>
                <div className="mt-1 text-sm text-slate-500">{formatSessionTime(session.startAt, session.endAt)}</div>
                <div className="mt-1 text-sm text-slate-500">{formatLocation(session)}</div>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {statusLabel(session.status)}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <CompactStat label="Sức chứa" value={session.capacity} />
              <CompactStat label="Đã đăng ký" value={session.confirmedCount} />
              <CompactStat label="Đang giữ chỗ" value={session.reservedCount} />
              <CompactStat label="Đã check-in" value={session.checkedInCount} />
              <CompactStat label="Còn trống" value={session.remainingSeats} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatValue({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function CompactStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <span className="text-slate-500">{label}: </span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
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
            {formatSeatSummary(session)}, {formatMoney(Number(session.feeAmount), session.currency ?? "VND")}
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
        <Button
          type="button"
          onClick={() => onSave(form)}
          disabled={disabled || session.status === "CANCELED"}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-300"
        >
          <Save size={16} />
          Lưu buổi workshop
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          disabled={disabled || session.status === "CANCELED"}
          className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:text-slate-400"
        >
          <Trash2 size={16} />
          Hủy buổi workshop
        </Button>
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

function adminWorkshopNoticeKey(workshopId: string) {
  return `unihub-admin-workshop-notice:${workshopId}`;
}

function readAdminWorkshopNotice(workshopId: string): InitialAiSummaryNotice {
  if (typeof window === "undefined") {
    return { notice: null, summaryStatus: null };
  }

  const key = adminWorkshopNoticeKey(workshopId);
  const storedNotice = window.sessionStorage.getItem(key);
  if (!storedNotice) {
    return { notice: null, summaryStatus: null };
  }

  window.sessionStorage.removeItem(key);
  try {
    const parsed = JSON.parse(storedNotice) as AdminNotice & Partial<UploadWorkshopDocumentResponse>;
    return {
      notice: { tone: parsed.tone, message: parsed.message },
      summaryStatus: parsed.documentId && parsed.uploadStatus && parsed.summaryStatus
        ? {
            documentId: parsed.documentId,
            workshopId: parsed.workshopId ?? workshopId,
            uploadStatus: parsed.uploadStatus,
            summaryStatus: parsed.summaryStatus,
            updatedAt: new Date().toISOString(),
          }
        : null,
    };
  } catch {
    return {
      notice: { tone: "info", message: storedNotice },
      summaryStatus: null,
    };
  }
}

function isTerminalSummaryStatus(status: DocumentSummaryStatusResponse["summaryStatus"]) {
  return status === "COMPLETED" || status === "FAILED";
}

function aiStatusLabel(status: DocumentSummaryStatusResponse["summaryStatus"]) {
  switch (status) {
    case "PENDING":
      return "Đang chờ xử lý";
    case "PROCESSING":
      return "Đang tạo tóm tắt";
    case "COMPLETED":
      return "Đã hoàn tất";
    case "FAILED":
      return "Không thể xử lý";
    default:
      return status;
  }
}

function uploadStatusLabel(status: DocumentSummaryStatusResponse["uploadStatus"]) {
  switch (status) {
    case "UPLOADED":
      return "Đã tải lên";
    case "FAILED":
      return "Không thể tải lên";
    default:
      return status;
  }
}

function renderAiSummary(summary: WorkshopAiSummaryResponse | null) {
  if (summary?.summaryStatus === "COMPLETED") {
    return summary.summaryText ? (
      <div className="space-y-2">
        {cleanAiSummaryText(summary.summaryText).map((line, index) => (
          <p key={`${line}-${index}`}>{line}</p>
        ))}
      </div>
    ) : (
      <p>Chưa có tóm tắt cho workshop này.</p>
    );
  }

  if (summary?.summaryStatus === "PENDING" || summary?.summaryStatus === "PROCESSING") {
    return <p>Hệ thống đang tạo tóm tắt. Vui lòng quay lại sau.</p>;
  }

  if (summary?.summaryStatus === "FAILED") {
    return <p>Tóm tắt workshop hiện chưa khả dụng.</p>;
  }

  return <p>Chưa có tóm tắt cho workshop này.</p>;
}

function cleanAiSummaryText(text: string) {
  return text
    .replace(/\*\*/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*]\s+/, ""))
    .filter(Boolean);
}

function formatAdminDateTime(value?: string | null) {
  if (!value) return "Chưa cập nhật";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
