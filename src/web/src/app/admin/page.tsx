import Link from "next/link";

export default function AdminPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-700">
          Quản trị
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Bảng điều hành
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Khu vực dành cho các công cụ của ban tổ chức như điểm danh, thanh
          toán, import sinh viên và quản lý workshop.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <AdminTile
          title="Điểm danh"
          description="Quản lý điểm danh và hoạt động của nhân sự."
        />
        <AdminTile
          title="Thanh toán"
          description="Theo dõi giao dịch và hoàn tiền sau khi tính năng được triển khai."
        />
        <AdminTile
          title="Quản lý workshop"
          description="Tạo, chỉnh sửa, xuất bản, hủy workshop và quản lý các buổi học."
          href="/admin/workshops"
          action="Mở trang quản lý workshop"
          tone="emerald"
        />
        <AdminTile
          title="Báo cáo import CSV"
          description="Theo dõi batch import sinh viên, dòng hợp lệ và lỗi cần xử lý."
          href="/admin/csv-imports"
          action="Mở báo cáo CSV"
          tone="emerald"
        />
      </div>
    </section>
  );
}

function AdminTile({
  title,
  description,
  href,
  action,
  tone = "slate",
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
  tone?: "slate" | "sky" | "emerald";
}) {
  const buttonClass =
    tone === "emerald"
      ? "bg-emerald-600 hover:bg-emerald-700"
      : tone === "sky"
        ? "bg-sky-600 hover:bg-sky-700"
        : "bg-slate-700 hover:bg-slate-800";

  return (
    <div className="rounded-lg border border-black/10 bg-white/70 p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      {href && action && (
        <div className="mt-3">
          <Link
            href={href}
            className={`inline-flex items-center rounded-md px-3 py-1 text-sm font-medium text-white ${buttonClass}`}
          >
            {action}
          </Link>
        </div>
      )}
    </div>
  );
}
