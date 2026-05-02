import Link from "next/link";
import { FaUser } from "react-icons/fa";
import { FaShieldHalved } from "react-icons/fa6";

export default function AuthPage() {
  return (
    <div className="flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl bg-white/90 p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">UniHub Workshop</h1>
          <p className="mt-1 text-sm text-slate-600">Chọn vai trò để tiếp tục</p>
        </div>

        <div className="mt-6 space-y-4">
          <Link
            href="/auth/login?role=student"
            className="flex items-center justify-between rounded-lg border border-black/10 bg-white px-4 py-4 shadow-sm hover:bg-slate-50"
          >
            <div className="flex items-center gap-5">
              <FaUser />
              <div>
                <p className="font-medium">Sinh viên</p>
                <p className="text-sm text-slate-500">Xem và đăng ký workshop</p>
              </div>
            </div>
            <div className="text-slate-400">➜</div>
          </Link>

          <Link
            href="/auth/login?role=organizer"
            className="flex items-center justify-between rounded-lg border border-black/10 bg-white px-4 py-4 shadow-sm hover:bg-slate-50"
          >
            <div className="flex items-center gap-5">
              <FaShieldHalved />
              <div>
                <p className="font-medium">Ban tổ chức</p>
                <p className="text-sm text-slate-500">Quản lý workshop và thống kê</p>
              </div>
            </div>
            <div className="text-slate-400">➜</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
