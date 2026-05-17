"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "../../../lib/apiClient";
import { clearTokens, login, normalizeRoles } from "../../../lib/auth";

export default function LoginPageClient() {
  const router = useRouter();
  const [role] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("role") ?? "";
  });
  const roleLabel =
    role === "organizer"
      ? "Ban tổ chức"
      : role === "student"
        ? "Sinh viên"
        : role === "checkin"
          ? "Nhân sự check-in"
          : "Người dùng";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = await login(email, password);
      const roles = normalizeRoles(payload.user?.roles);

      if (role === "organizer" && !roles.includes("organizer")) {
        clearTokens();
        throw new Error("Tài khoản này không có quyền ban tổ chức.");
      }

      if (role === "checkin" && !roles.includes("checkin_staff")) {
        clearTokens();
        throw new Error("Tài khoản này không có quyền check-in.");
      }

      if (role === "student" && !roles.includes("student")) {
        clearTokens();
        throw new Error("Tài khoản này không có quyền sinh viên.");
      }

      if (role === "organizer") {
        toast.success("Đăng nhập thành công.");
        router.replace("/admin/workshops");
        return;
      }

      if (role === "checkin") {
        toast.success("Đăng nhập thành công.");
        router.replace("/checkin");
        return;
      }

      toast.success("Đăng nhập thành công.");
      router.replace("/");
    } catch (err: unknown) {
      const message = getFriendlyErrorMessage(err, "Không thể đăng nhập. Vui lòng thử lại.");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl bg-white/90 p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">UniHub Workshop</h1>
          <p className="mt-1 text-sm text-slate-600">Đăng nhập với vai trò {roleLabel}</p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm"
              placeholder="you@example.com"
              type="email"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm"
              placeholder="••••••••"
            />
          </div>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <div className="flex items-center justify-between">
            <button
              className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
              disabled={loading}
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
            <a href="/auth" className="text-sm text-slate-600 hover:underline">
              Quay lại
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
