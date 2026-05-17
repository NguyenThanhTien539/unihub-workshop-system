"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { clearTokens, getCurrentUser, hasStoredSession, logout, normalizeRoles, type AuthUser } from "../lib/auth";
import Button from "./Button";
import { NotificationBell } from "./NotificationBell";

export default function MainHeader() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      if (!hasStoredSession()) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        if (mounted) setUser(currentUser);
      } catch {
        clearTokens();
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  const roleList = [
    { role: "student", label: "Sinh viên" },
    { role: "organizer", label: "Ban tổ chức" },
    { role: "checkin_staff", label: "Nhân viên check-in" },
  ];

  const roles = normalizeRoles(user?.roles || []);
  const displayRoles = roleList.filter((item) => roles.includes(item.role)).map((item) => item.label);
  const isStudent = roles.includes("student");
  const isOrganizer = roles.includes("organizer");
  const isCheckinStaff = roles.includes("checkin_staff");

  return (
    <div className="rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link href="/" className="text-3xl font-semibold text-slate-950">
            UniHub Workshop
          </Link>
          <p className="mt-2 text-sm text-slate-600">
            Khám phá workshop, đăng ký, nhận mã QR và check-in trong một nơi.
          </p>
        </div>

        <div className="flex flex-col gap-4 lg:items-end">
          <nav className="flex flex-wrap gap-2 text-sm font-medium">
            <NavLink href="/">Workshop</NavLink>
            {isStudent ? <NavLink href="/registrations">Đăng ký của tôi</NavLink> : null}
            {isCheckinStaff ? <NavLink href="/checkin">Check-in</NavLink> : null}
            {isOrganizer ? <NavLink href="/admin">Ban tổ chức</NavLink> : null}
          </nav>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {loading ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">Đang kiểm tra phiên đăng nhập...</span>
            ) : user ? (
              <div className="flex flex-wrap items-center gap-3">
                <NotificationBell />
                <div className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">
                  {user.fullName} · {displayRoles.join(", ")}
                </div>
                <Button
                  type="button"
                  onClick={() => void handleLogout(router)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Đăng xuất
                </Button>
              </div>
            ) : (
              <Button href="/auth" className="rounded-full px-4 py-2">
                Đăng nhập
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

async function handleLogout(router: ReturnType<typeof useRouter>) {
  await logout();
  toast.success("Đã đăng xuất.");
  router.replace("/auth");
  router.refresh();
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}
