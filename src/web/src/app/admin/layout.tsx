"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureAdminAuth, clearTokens, logout } from "../../lib/adminAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const ok = await ensureAdminAuth();
      if (!mounted) return;

      if (!ok) {
        clearTokens();
        router.replace("/auth/login?role=organizer");
        return;
      }

      setChecking(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSwitchRole() {
    await logout();
    router.replace("/auth");
  }

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse rounded-lg bg-white/90 p-6 shadow">Đang kiểm tra quyền...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-purple-600 to-indigo-500 text-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Quản trị Workshop</h1>
              <p className="mt-1 text-sm text-purple-100">Quản lý và theo dõi hoạt động workshop</p>
            </div>
            <div>
              <button
                onClick={handleSwitchRole}
                className="rounded-md bg-white/20 px-3 py-1 text-sm font-medium text-white hover:bg-white/30"
              >
                Đổi vai trò
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
