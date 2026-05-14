"use client";

import { use, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Calendar, Clock, LoaderCircle, MapPin, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFriendlyErrorMessage, getRetryAfterSeconds } from "../../../../lib/apiClient";
import { getCurrentUser, hasStoredSession, normalizeRoles, type AuthUser } from "../../../../lib/auth";
import {
  clearPaidRegistrationIdempotencyKey,
  createPaymentUrl,
  getOrCreatePaidRegistrationIdempotencyKey,
  listMyRegistrations,
  registerFree,
  registerPaid,
  type RegistrationResponse,
} from "../../../../lib/registrations";
import {
  formatLocation,
  formatMoney,
  formatSeatSummary,
  formatSessionDate,
  formatSessionTime,
  getFirstSession,
  getPublicWorkshop,
  statusLabel,
  type WorkshopDetail,
  type WorkshopSession,
} from "../../../../lib/workshops";

type Notice = {
  tone: "success" | "error" | "info";
  message: string;
};

export default function WorkshopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [workshop, setWorkshop] = useState<WorkshopDetail | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [confirmSession, setConfirmSession] = useState<WorkshopSession | null>(null);
  const [confirmMode, setConfirmMode] = useState<"FREE" | "PAID" | null>(null);

  const roles = useMemo(() => normalizeRoles(currentUser?.roles), [currentUser?.roles]);
  const isStudent = roles.includes("student");

  useEffect(() => {
    void loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.id]);

  const registrationsBySession = useMemo(
    () => new Map(registrations.map((registration) => [registration.sessionId, registration])),
    [registrations],
  );

  async function loadPage() {
    setLoading(true);
    setError(null);

    try {
      const workshopDetail = await getPublicWorkshop(resolvedParams.id);
      setWorkshop(workshopDetail);

      if (!hasStoredSession()) {
        setCurrentUser(null);
        setRegistrations([]);
        return;
      }

      const user = await getCurrentUser();
      setCurrentUser(user);

      if (normalizeRoles(user.roles).includes("student")) {
        const ownRegistrations = await listMyRegistrations();
        for (const registration of ownRegistrations) {
          if (registration.registrationStatus !== "PENDING_PAYMENT") {
            clearPaidRegistrationIdempotencyKey(registration.sessionId);
          }
        }
        setRegistrations(ownRegistrations);
      } else {
        setRegistrations([]);
      }
    } catch (err) {
      setWorkshop(null);
      setError(getFriendlyErrorMessage(err, "Khong tai duoc workshop."));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!confirmSession || !confirmMode) return;

    setBusySessionId(confirmSession.id);
    setNotice(null);

    try {
      if (confirmMode === "FREE") {
        await registerFree(confirmSession.id);
        clearPaidRegistrationIdempotencyKey(confirmSession.id);
        setNotice({
          tone: "success",
          message:
            "Dang ky thanh cong. Ma QR da duoc tao. Email xac nhan da duoc gui neu cau hinh email hoat dong.",
        });
      } else {
        const response = await registerPaid(
          confirmSession.id,
          getOrCreatePaidRegistrationIdempotencyKey(confirmSession.id),
        );
        if (response.registrationStatus !== "PENDING_PAYMENT") {
          clearPaidRegistrationIdempotencyKey(confirmSession.id);
        }
        setNotice({
          tone: "success",
          message: response.paymentIntentId
            ? "Dang ky co phi da duoc tao. Hay thanh toan de nhan ma QR."
            : "Dang ky co phi da duoc tao va dang cho thanh toan.",
        });
      }

      setConfirmSession(null);
      setConfirmMode(null);
      await loadPage();
    } catch (err) {
      const retryAfter = getRetryAfterSeconds(err);
      const message = getFriendlyErrorMessage(err, "Khong dang ky duoc buoi nay.");
      setNotice({
        tone: "error",
        message: retryAfter ? `${message} Thu lai sau ${retryAfter} giay.` : message,
      });
    } finally {
      setBusySessionId(null);
    }
  }

  async function handleContinuePayment(registration: RegistrationResponse) {
    if (!registration.paymentIntentId) return;

    setBusySessionId(registration.sessionId);
    setNotice(null);

    try {
      const payment = await createPaymentUrl(registration.paymentIntentId);
      if (payment.paymentUrl) {
        window.open(payment.paymentUrl, "_blank", "noopener,noreferrer");
        setNotice({
          tone: "info",
          message: "Da mo lien ket thanh toan moi. Sau khi thanh toan, hay quay lai va kiem tra trang thai.",
        });
      } else {
        setNotice({
          tone: "info",
          message: "Dang ky dang cho thanh toan, nhung backend chua tra paymentUrl.",
        });
      }
    } catch (err) {
      setNotice({
        tone: "error",
        message: getFriendlyErrorMessage(err, "Khong tao duoc lien ket thanh toan."),
      });
    } finally {
      setBusySessionId(null);
    }
  }

  if (loading) {
    return <div className="min-h-[520px] animate-pulse rounded-3xl bg-white shadow-sm" />;
  }

  if (error || !workshop) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-6">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-red-700"
        >
          <ArrowLeft size={16} />
          Back to workshops
        </button>
        <h1 className="text-xl font-semibold text-red-900">Unable to open this workshop</h1>
        <p className="mt-2 text-sm text-red-700">
          {error ?? "Workshop does not exist or is not published yet."}
        </p>
      </section>
    );
  }

  const firstSession = getFirstSession(workshop);

  return (
    <>
      <section className="space-y-6">
        <div className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-sm">
          <div className="relative min-h-[360px]">
            <img
              src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1800&q=75"
              alt={workshop.title}
              className="absolute inset-0 h-full w-full object-cover opacity-45"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

            <button
              type="button"
              onClick={() => router.push("/")}
              className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur hover:bg-white/25"
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <div className="relative z-10 flex min-h-[360px] flex-col justify-end p-6 sm:p-10">
              <div className="mb-4 flex flex-wrap gap-2">
                <Chip>{statusLabel(workshop.status)}</Chip>
                {firstSession ? <Chip tone="dark">{formatMoney(firstSession.feeAmount, firstSession.currency ?? "VND")}</Chip> : null}
              </div>
              <h1 className="max-w-4xl text-3xl font-bold sm:text-5xl">{workshop.title}</h1>
              <div className="mt-5 flex flex-wrap gap-5 text-sm text-white/90">
                <span className="inline-flex items-center gap-2">
                  <UserRound size={17} />
                  {workshop.speaker}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Calendar size={17} />
                  {formatSessionDate(firstSession?.startAt)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock size={17} />
                  {formatSessionTime(firstSession?.startAt, firstSession?.endAt)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin size={17} />
                  {formatLocation(firstSession)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {notice ? <NoticeBanner notice={notice} /> : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Overview</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{workshop.description}</p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Sessions and registration</h2>
                  <p className="text-sm text-slate-500">
                    Live seat counts, payment state, and registration actions are synced from backend APIs.
                  </p>
                </div>
                {isStudent ? (
                  <Link href="/registrations" className="text-sm font-medium text-sky-700 hover:text-sky-900">
                    Open My Registrations
                  </Link>
                ) : null}
              </div>

              <div className="mt-4 space-y-4">
                {workshop.sessions.length > 0 ? (
                  workshop.sessions.map((session) => {
                    const registration = registrationsBySession.get(session.id);
                    const action = getSessionAction({
                      session,
                      registration,
                      isStudent,
                      isLoggedIn: Boolean(currentUser),
                      busy: busySessionId === session.id,
                    });

                    return (
                      <article key={session.id} className="rounded-2xl border border-slate-200 p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="font-medium text-slate-950">{formatSessionDate(session.startAt)}</div>
                            <div className="mt-1 text-sm text-slate-600">
                              {formatSessionTime(session.startAt, session.endAt)} at {formatLocation(session)}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <InlineTag>{statusLabel(session.status)}</InlineTag>
                              <InlineTag>{session.feeType === "FREE" ? "Free session" : "Paid session"}</InlineTag>
                              <InlineTag>{formatMoney(session.feeAmount, session.currency ?? "VND")}</InlineTag>
                              {registration ? <InlineTag tone="sky">{registration.registrationStatus}</InlineTag> : null}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={action.disabled}
                            onClick={() => handleAction(action.kind, session, registration)}
                            className={buttonClass(action)}
                          >
                            {busySessionId === session.id ? (
                              <>
                                <LoaderCircle size={16} className="animate-spin" />
                                Processing...
                              </>
                            ) : (
                              action.label
                            )}
                          </button>
                        </div>

                        <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-4">
                          <span>{formatSeatSummary(session)}</span>
                          <span>Confirmed: {session.seatsConfirmed}</span>
                          <span>Reserved: {session.seatsReserved}</span>
                          <span>Capacity: {session.seatCapacity}</span>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">This workshop has no sessions yet.</div>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Registration status</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {!currentUser ? (
                  <>
                    <p>Sign in as a student to register, pay, and open your QR ticket.</p>
                    <Link
                      href="/auth/login?role=student"
                      className="inline-flex rounded-full bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800"
                    >
                      Sign in as student
                    </Link>
                  </>
                ) : isStudent ? (
                  <>
                    <p>You are signed in as {currentUser.fullName}.</p>
                    <p>Each session button below reflects current seat availability and your own registration state.</p>
                    <Link href="/registrations" className="inline-flex text-sm font-medium text-sky-700 hover:text-sky-900">
                      Manage my registrations
                    </Link>
                  </>
                ) : (
                  <p>Only student accounts can register for workshops. Organizer and check-in accounts can browse details but cannot book seats.</p>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Quick facts</h2>
              <div className="mt-4 space-y-4 text-sm text-slate-700">
                <InfoRow icon={<Calendar size={18} />} label="Date" value={formatSessionDate(firstSession?.startAt)} />
                <InfoRow icon={<Clock size={18} />} label="Time" value={formatSessionTime(firstSession?.startAt, firstSession?.endAt)} />
                <InfoRow icon={<MapPin size={18} />} label="Location" value={formatLocation(firstSession)} />
                <InfoRow icon={<Users size={18} />} label="Seats" value={formatSeatSummary(firstSession)} />
              </div>
            </section>
          </aside>
        </div>
      </section>

      {confirmSession && confirmMode ? (
        <ConfirmationModal
          session={confirmSession}
          mode={confirmMode}
          submitting={busySessionId === confirmSession.id}
          onCancel={() => {
            if (busySessionId !== confirmSession.id) {
              setConfirmSession(null);
              setConfirmMode(null);
            }
          }}
          onConfirm={handleRegister}
        />
      ) : null}
    </>
  );

  function handleAction(
    kind: SessionAction["kind"],
    session: WorkshopSession,
    registration: RegistrationResponse | undefined,
  ) {
    if (kind === "LOGIN") {
      router.push("/auth/login?role=student");
      return;
    }

    if (kind === "INFO") {
      return;
    }

    if (kind === "FREE" || kind === "PAID") {
      setConfirmSession(session);
      setConfirmMode(kind);
      return;
    }

    if (kind === "PAY" && registration) {
      void handleContinuePayment(registration);
    }
  }
}

type SessionAction = {
  kind: "FREE" | "PAID" | "PAY" | "LOGIN" | "INFO";
  label: string;
  disabled: boolean;
};

function getSessionAction({
  session,
  registration,
  isStudent,
  isLoggedIn,
  busy,
}: {
  session: WorkshopSession;
  registration?: RegistrationResponse;
  isStudent: boolean;
  isLoggedIn: boolean;
  busy: boolean;
}): SessionAction {
  if (registration?.registrationStatus === "CONFIRMED") {
    return { kind: "INFO", label: "Da dang ky", disabled: true };
  }

  if (registration?.registrationStatus === "PENDING_PAYMENT") {
    return { kind: "PAY", label: "Thanh toan", disabled: busy };
  }

  if (!isLoggedIn) {
    return { kind: "LOGIN", label: "Dang nhap de dang ky", disabled: false };
  }

  if (!isStudent) {
    return { kind: "INFO", label: "Chi sinh vien duoc dang ky", disabled: true };
  }

  if (session.status !== "OPEN") {
    return { kind: "INFO", label: "Da dong dang ky", disabled: true };
  }

  if (session.remainingSeats <= 0) {
    return { kind: "INFO", label: "Het cho", disabled: true };
  }

  if (session.feeType === "FREE") {
    return { kind: "FREE", label: "Dang ky mien phi", disabled: busy };
  }

  return { kind: "PAID", label: "Dang ky co phi", disabled: busy };
}

function buttonClass(action: SessionAction) {
  if (action.disabled) {
    return "inline-flex min-w-[190px] items-center justify-center gap-2 rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500";
  }

  if (action.kind === "PAY") {
    return "inline-flex min-w-[190px] items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600";
  }

  if (action.kind === "FREE") {
    return "inline-flex min-w-[190px] items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700";
  }

  if (action.kind === "LOGIN") {
    return "inline-flex min-w-[190px] items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800";
  }

  return "inline-flex min-w-[190px] items-center justify-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700";
}

function ConfirmationModal({
  session,
  mode,
  submitting,
  onCancel,
  onConfirm,
}: {
  session: WorkshopSession;
  mode: "FREE" | "PAID";
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-slate-950">
          {mode === "FREE" ? "Confirm free registration" : "Confirm paid registration"}
        </h2>
        <div className="mt-4 space-y-2 text-sm text-slate-600">
          <p>{formatSessionDate(session.startAt)}</p>
          <p>
            {formatSessionTime(session.startAt, session.endAt)} at {formatLocation(session)}
          </p>
          <p>
            Seats: {formatSeatSummary(session)} · Fee: {formatMoney(session.feeAmount, session.currency ?? "VND")}
          </p>
          {mode === "PAID" ? (
            <p>QR code will only be available after payment is confirmed.</p>
          ) : (
            <p>QR code will be available immediately after registration succeeds.</p>
          )}
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400"
          >
            {submitting ? <LoaderCircle size={16} className="animate-spin" /> : null}
            {submitting ? "Submitting..." : "Confirm"}
          </button>
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

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClass}`}>{notice.message}</div>;
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
      <div className="text-sky-600">{icon}</div>
      <div>
        <div className="font-medium text-slate-950">{label}</div>
        <div className="mt-1 text-slate-600">{value}</div>
      </div>
    </div>
  );
}

function Chip({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" }) {
  return (
    <span
      className={
        tone === "dark"
          ? "rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold"
          : "rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-950"
      }
    >
      {children}
    </span>
  );
}

function InlineTag({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "sky" }) {
  return (
    <span
      className={
        tone === "sky"
          ? "rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700"
          : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
      }
    >
      {children}
    </span>
  );
}
