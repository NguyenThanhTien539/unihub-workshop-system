"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { clearTokens, getCurrentUser, hasStoredSession, logout, normalizeRoles, type AuthUser } from "../lib/auth";

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

  const roles = normalizeRoles(user?.roles);
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
            Workshop, registration, QR ticket, and check-in sync in one place.
          </p>
        </div>

        <div className="flex flex-col gap-4 lg:items-end">
          <nav className="flex flex-wrap gap-2 text-sm font-medium">
            <NavLink href="/">Workshops</NavLink>
            {isStudent ? <NavLink href="/registrations">My Registrations</NavLink> : null}
            {isCheckinStaff ? <NavLink href="/checkin">Check-in</NavLink> : null}
            {isOrganizer ? <NavLink href="/admin/workshops">Organizer</NavLink> : null}
          </nav>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {loading ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">Checking session...</span>
            ) : user ? (
              <>
                <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">
                  {user.fullName} · {roles.join(", ")}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className="rounded-full bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-800"
              >
                Sign in
              </Link>
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
