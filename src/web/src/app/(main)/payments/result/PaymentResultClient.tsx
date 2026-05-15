"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getFriendlyErrorMessage } from "../../../../lib/apiClient";
import {
  getRegistration,
  getPaymentStatus,
  type PaymentStatusResponse,
  type RegistrationResponse,
} from "../../../../lib/registrations";
import {
  formatDateTime,
  formatMoney,
  formatSessionDate,
  formatSessionTime,
} from "../../../../lib/workshops";

type Notice = {
  tone: "success" | "error" | "info";
  message: string;
};

export default function PaymentResultClient() {
  const searchParams = useSearchParams();
  const paymentIntentId = searchParams.get("paymentIntentId");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [payment, setPayment] = useState<PaymentStatusResponse | null>(null);
  const [registration, setRegistration] = useState<RegistrationResponse | null>(
    null,
  );

  const pageTitle = useMemo(() => {
    if (!payment) return "Trạng thái thanh toán";
    if (payment.registrationStatus === "CONFIRMED" || payment.status === "SUCCEEDED") {
      return "Đăng ký thành công";
    }
    if (payment.status === "FAILED" || payment.status === "EXPIRED") {
      return "Thanh toán chưa hoàn tất";
    }
    return "Đang chờ thanh toán";
  }, [payment]);

  const amountText = useMemo(() => {
    if (!registration) return "Chưa có";
    const amount = registration.amount ?? null;
    const currency = registration.currency ?? "VND";
    return formatMoney(amount, currency ?? "VND");
  }, [registration]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setNotice(null);

      if (!paymentIntentId) {
        setNotice({
          tone: "error",
          message: "Không tìm thấy paymentIntentId trên URL.",
        });
        setLoading(false);
        return;
      }

      try {
        const paymentStatus = await getPaymentStatus(paymentIntentId);
        if (!mounted) return;
        setPayment(paymentStatus);

        const registrationDetail = await getRegistration(
          paymentStatus.registrationId,
        );
        if (!mounted) return;
        setRegistration(registrationDetail);
      } catch (err) {
        if (!mounted) return;
        setNotice({
          tone: "error",
          message: getFriendlyErrorMessage(
            err,
            "Không lấy được thông tin thanh toán.",
          ),
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [paymentIntentId]);

  if (loading) {
    return (
      <div className="min-h-[320px] animate-pulse rounded-3xl bg-white shadow-sm" />
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-950">
              {pageTitle}
            </h1>
            {payment ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {paymentStatusLabel(payment.status)}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-slate-500">
            Trang này hiển thị thông tin đặt chỗ. Mã QR sẽ được cấp sau khi
            thanh toán thành công.
          </p>
        </div>

        {notice ? <NoticeBanner notice={notice} /> : null}

        {payment && registration ? (
          <div className="mt-6 grid gap-5">
            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm sm:grid-cols-2">
              <InfoRow
                label="Trạng thái thanh toán"
                value={paymentStatusLabel(payment.status)}
              />
              <InfoRow
                label="Trạng thái đăng ký"
                value={registrationStatusLabel(payment.registrationStatus)}
              />
              <InfoRow label="Số tiền" value={amountText} />
              <InfoRow
                label="Ma QR"
                value={payment.qrTicketId ?? "Chưa có"}
              />
              <InfoRow
                label="Mã paymentIntent"
                value={payment.paymentIntentId}
              />
              <InfoRow label="Mã đăng ký" value={registration.registrationId} />
              <InfoRow
                label="Thời gian tạo"
                value={formatDateTime(registration.createdAt)}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-base font-semibold text-slate-950">
                {registration.workshopTitle}
              </div>
              <div className="mt-2 text-sm text-slate-600">
                {formatSessionDate(registration.startAt)} ·{" "}
                {formatSessionTime(registration.startAt, registration.endAt)}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {`${registration.roomName}, ${registration.building}`}
              </div>
              {registration.confirmedAt ? (
                <div className="mt-3 text-sm text-emerald-600">
                  Xác nhận lúc: {formatDateTime(registration.confirmedAt)}
                </div>
              ) : null}
              {payment.qrAvailable ? (
                <div className="mt-3 text-sm text-sky-600">
                  Mã QR đã sẵn sàng trong trang danh sách đăng ký.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/registrations"
            className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Xem danh sách đăng ký
          </Link>
          <Link
            href="/"
            className="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </section>
  );
}

function NoticeBanner({ notice }: { notice: Notice }) {
  const toneClass =
    notice.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : notice.tone === "info"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${toneClass}`}>
      {notice.message}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="font-medium text-slate-900">{value}</div>
    </div>
  );
}

function registrationStatusLabel(status: string) {
  switch (status) {
    case "PENDING_PAYMENT":
      return "Chờ thanh toán";
    case "CONFIRMED":
      return "Đã xác nhận";
    case "PAYMENT_FAILED":
      return "Thanh toán thất bại";
    case "EXPIRED":
      return "Đã hết hạn";
    case "CANCELED":
      return "Đã hủy";
    default:
      return status;
  }
}

function paymentStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Đang chờ";
    case "SUCCEEDED":
      return "Thành công";
    case "FAILED":
      return "Thất bại";
    case "EXPIRED":
      return "Đã hết hạn";
    default:
      return status;
  }
}
