"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, QrCode } from "lucide-react";
import Link from "next/link";
import { RegisteredWorkshopCard } from "../../../components/RegisteredWorkshopCard";
import { getFriendlyErrorMessage } from "../../../lib/apiClient";
import { getCurrentUser, hasStoredSession, normalizeRoles } from "../../../lib/auth";
import {
  clearPaidRegistrationIdempotencyKey,
  createPaymentUrl,
  getPaymentStatus,
  getRegistrationQr,
  listMyRegistrations,
  type RegistrationQrResponse,
  type RegistrationResponse,
} from "../../../lib/registrations";

type Notice = {
  tone: "success" | "error" | "info";
  message: string;
};

export default function RegistrationsPage() {
  const [registrations, setRegistrations] = useState<RegistrationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [qrLoadingId, setQrLoadingId] = useState<string | null>(null);
  const [paymentLoadingId, setPaymentLoadingId] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<{
    registration: RegistrationResponse;
    qr: RegistrationQrResponse;
  } | null>(null);
  const [isStudent, setIsStudent] = useState(false);
  const [checkedSession, setCheckedSession] = useState(false);

  const sortedRegistrations = useMemo(
    () =>
      [...registrations].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [registrations],
  );

  useEffect(() => {
    void loadRegistrations();
  }, []);

  async function loadRegistrations() {
    setLoading(true);
    setError(null);

    try {
      if (!hasStoredSession()) {
        setIsStudent(false);
        return;
      }

      const user = await getCurrentUser();
      const student = normalizeRoles(user.roles).includes("student");
      setIsStudent(student);
      setCheckedSession(true);

      if (!student) {
        return;
      }

      const response = await listMyRegistrations();
      for (const registration of response) {
        if (registration.registrationStatus !== "PENDING_PAYMENT") {
          clearPaidRegistrationIdempotencyKey(registration.sessionId);
        }
      }
      setRegistrations(response);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Không tải được danh sách đăng ký."));
    } finally {
      setLoading(false);
      setCheckedSession(true);
    }
  }

  async function handleShowQr(registration: RegistrationResponse) {
    setQrLoadingId(registration.registrationId);
    setNotice(null);

    try {
      const qr = await getRegistrationQr(registration.registrationId);
      setQrModal({ registration, qr });
    } catch (err) {
      setNotice({
        tone: "error",
        message: getFriendlyErrorMessage(err, "Không tải được mã QR."),
      });
    } finally {
      setQrLoadingId(null);
    }
  }

  async function handleContinuePayment(registration: RegistrationResponse) {
    if (!registration.paymentIntentId) return;

    setPaymentLoadingId(registration.registrationId);
    setNotice(null);

    try {
      const payment = await createPaymentUrl(registration.paymentIntentId);
      if (payment.paymentUrl) {
        window.open(payment.paymentUrl, "_blank", "noopener,noreferrer");
        setNotice({
          tone: "info",
          message: "Liên kết thanh toán đã được mở trong tab mới.",
        });
      } else {
        setNotice({
          tone: "info",
          message: "Đăng ký vẫn chờ thanh toán, nhưng backend chưa trả paymentUrl.",
        });
      }
    } catch (err) {
      setNotice({
        tone: "error",
        message: getFriendlyErrorMessage(err, "Không tạo được liên kết thanh toán."),
      });
    } finally {
      setPaymentLoadingId(null);
    }
  }

  async function handleRefreshPayment(registration: RegistrationResponse) {
    if (!registration.paymentIntentId) return;

    setPaymentLoadingId(registration.registrationId);
    setNotice(null);

    try {
      const status = await getPaymentStatus(registration.paymentIntentId);
      await loadRegistrations();

      setNotice({
        tone: status.qrAvailable ? "success" : "info",
        message: status.qrAvailable
          ? "Thanh toán đã được xác nhận. Mã QR sẵn sàng."
          : `Trạng thái thanh toán hiện tại: ${status.status}.`,
      });
    } catch (err) {
      setNotice({
        tone: "error",
        message: getFriendlyErrorMessage(err, "Không kiểm tra được trạng thái thanh toán."),
      });
    } finally {
      setPaymentLoadingId(null);
    }
  }

  if (loading) {
    return <div className="min-h-[360px] animate-pulse rounded-3xl bg-white shadow-sm" />;
  }

  if (!hasStoredSession() || !checkedSession || !isStudent) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">Đăng ký của tôi</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Đăng nhập bằng tài khoản sinh viên để xem đăng ký, tiếp tục thanh toán và mở vé QR.
        </p>
        <Link
          href="/auth/login?role=student"
          className="mt-5 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Đăng nhập sinh viên
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">Đăng ký của tôi</h1>
              <p className="mt-1 text-sm text-slate-500">
                Mở vé QR, tiếp tục thanh toán và kiểm tra trạng thái đăng ký mới nhất.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadRegistrations()}
              className="inline-flex w-fit rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Làm mới
            </button>
          </div>
        </div>

        {notice ? <NoticeBanner notice={notice} /> : null}
        {error ? <NoticeBanner notice={{ tone: "error", message: error }} /> : null}

        {sortedRegistrations.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
            Bạn chưa đăng ký buổi học nào.
          </div>
        ) : (
          <div className="space-y-4">
            {sortedRegistrations.map((registration) => (
              <RegisteredWorkshopCard
                key={registration.registrationId}
                title={registration.workshopTitle}
                roomName={registration.roomName}
                building={registration.building}
                startAt={registration.startAt}
                endAt={registration.endAt}
                registrationStatus={registration.registrationStatus}
                registrationType={registration.registrationType}
                paymentStatus={registration.paymentStatus}
                amount={registration.amount}
                currency={registration.currency}
                createdAt={registration.createdAt}
                confirmedAt={registration.confirmedAt}
                qrAvailable={registration.qrAvailable}
                qrLoading={qrLoadingId === registration.registrationId}
                onShowQr={registration.qrAvailable ? () => void handleShowQr(registration) : undefined}
                action={
                  registration.registrationStatus === "PENDING_PAYMENT" && registration.paymentIntentId ? (
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        loading={paymentLoadingId === registration.registrationId}
                        label="Thanh toán"
                        onClick={() => void handleContinuePayment(registration)}
                      />
                      <ActionButton
                        loading={paymentLoadingId === registration.registrationId}
                        label="Kiểm tra thanh toán"
                        tone="secondary"
                        onClick={() => void handleRefreshPayment(registration)}
                      />
                    </div>
                  ) : null
                }
              />
            ))}
          </div>
        )}
      </section>

      {qrModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Vé QR</h2>
                <p className="mt-1 text-sm text-slate-500">{qrModal.registration.workshopTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setQrModal(null)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <img src={qrModal.qr.dataUrl} alt="Vé QR workshop" className="mx-auto w-full max-w-xs rounded-2xl bg-white p-3" />
            </div>

            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>Buổi học: {qrModal.registration.roomName}, {qrModal.registration.building}</p>
              <p>Trạng thái QR: {qrModal.qr.status}</p>
              <p>Hết hạn lúc: {new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(qrModal.qr.expiresAt))}</p>
              <p className="rounded-2xl bg-sky-50 px-3 py-3 text-sky-700">
                Vui lòng xuất trình mã QR này tại quầy check-in.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function NoticeBanner({ notice }: { notice: Notice }) {
  const toneClass =
    notice.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : notice.tone === "error"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-sky-200 bg-sky-50 text-sky-700";

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClass}`}>{notice.message}</div>;
}

function ActionButton({
  label,
  loading,
  tone = "primary",
  onClick,
}: {
  label: string;
  loading: boolean;
  tone?: "primary" | "secondary";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={
        tone === "secondary"
          ? "inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
          : "inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:bg-amber-300"
      }
    >
      {loading ? <LoaderCircle size={16} className="animate-spin" /> : tone === "primary" ? <QrCode size={16} /> : null}
      {loading ? "Đang tải..." : label}
    </button>
  );
}
