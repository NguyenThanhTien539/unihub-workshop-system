"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { clearTokens, getCurrentUser, hasStoredSession, logout, normalizeRoles, type AuthUser } from "../lib/auth";
import Button from "./Button";

export default function MainHeader() {
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
  ]

  const roles = normalizeRoles(user?.roles || []).map(r => roleList.find(role => role.role === r)?.label || r);
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
            Workshop, đăng ký, vé QR và check-in đồng bộ trong một nền tảng duy nhất.
          </p>
        </div>

        <div className="flex flex-col gap-4 lg:items-end">
          <nav className="flex flex-wrap gap-2 text-sm font-medium">
            <NavLink href="/">Workshop</NavLink>
            {isStudent ? <NavLink href="/registrations">Các lượt đăng ký của tôi</NavLink> : null}
            {isCheckinStaff ? <NavLink href="/checkin">Check-in</NavLink> : null}
            {isOrganizer ? <NavLink href="/admin/workshops">Ban tổ chức</NavLink> : null}
          </nav>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {loading ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">Đang kiểm tra phiên...</span>
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">
                  {user.fullName} · {roles.join(", ")}
                </div>
                <Button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-slate-300 hover:bg-black"
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

async function handleLogout() {
  await logout();
  window.location.href = "/auth";
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
