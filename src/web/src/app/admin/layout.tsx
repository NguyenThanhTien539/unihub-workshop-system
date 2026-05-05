"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureAdminAuth, clearTokens } from "../../lib/adminAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const ok = await ensureAdminAuth();
      if (!mounted) return;
      if (!ok) {
        // ensure tokens cleared and send to shared auth page
        clearTokens();
        router.replace('/auth/login?role=organizer');
        return;
      }
      setChecking(false);
    })();
    return () => { mounted = false };
  }, [router]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse rounded-lg bg-white/90 p-6 shadow">Đang kiểm tra quyền...</div>
      </div>
    );
  }

  return <>{children}</>;
}
