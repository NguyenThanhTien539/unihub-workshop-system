"use client"

import { use } from "react";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const resolvedSearchParams = use(searchParams);
  const role = resolvedSearchParams?.role;
  const roleLabel = role === "organizer" ? "Ban tổ chức" : role === "student" ? "Sinh viên" : "Người dùng";

  return (
    <div className="flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl bg-white/90 p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">UniHub Workshop</h1>
          <p className="mt-1 text-sm text-slate-600">Đăng nhập - {roleLabel}</p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {role === "student" ? "Mã sinh viên hoặc Email" : role === "organizer" ? "Email tổ chức" : "Email"}
            </label>
            <input
              className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm"
              placeholder={role === "student" ? "vd: 123456 hoặc you@example.com" : "you@organization.com"}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mật khẩu</label>
            <input
              type="password"
              className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between">
            <button className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
              Đăng nhập
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
