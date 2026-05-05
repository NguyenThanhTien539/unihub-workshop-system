"use client"

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setTokens } from "../../../lib/adminAuth";
import { apiFetch } from "../../../lib/api";

export default function LoginPageClient() {
  const router = useRouter();
  const [role, setRole] = useState<string>("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRole(params.get("role") ?? "");
  }, []);
  const roleLabel = role === "organizer" ? "Ban tổ chức" : role === "student" ? "Sinh viên" : "Người dùng";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      console.log("Fetch API");
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, password: password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Login failed');

      // try a few places for tokens
      const data = json?.data ?? json;
      const access = data?.accessToken ?? data?.token?.accessToken ?? data?.token ?? data?.access;
      const refresh = data?.refreshToken ?? data?.token?.refreshToken ?? null;
      if (!access) throw new Error('No access token returned');
      setTokens(String(access), refresh ? String(refresh) : undefined);
      
        // set a short-lived cookie and delay the redirect slightly so it's easy
        // to inspect localStorage/cookies in DevTools during debugging
        try {
          document.cookie = `admin_access_set=1; path=/`;
        } catch (e) {
          // ignore
        }
        await new Promise((r) => setTimeout(r, 300));

      if (role === 'organizer' || role === 'admin') {
        router.replace('/admin/workshops');
      } else {
        router.replace('/');
      }
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl bg-white/90 p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">UniHub Workshop</h1>
          <p className="mt-1 text-sm text-slate-600">Đăng nhập - {roleLabel}</p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {role === 'student' ? 'Mã sinh viên hoặc Email' : 'Email'}
            </label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm"
              placeholder={role === 'student' ? 'vd: 123456 hoặc you@example.com' : 'you@organization.com'}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex items-center justify-between">
            <button className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
            <a href="/auth" className="text-sm text-slate-600 hover:underline">Quay lại</a>
          </div>
        </form>
      </div>
    </div>
  );
}
