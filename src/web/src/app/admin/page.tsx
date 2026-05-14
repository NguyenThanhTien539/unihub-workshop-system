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
          Khu vực dành cho các công cụ của ban tổ chức như điểm danh, thanh toán
          và quản lý workshop.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Điểm danh</h2>
          <p className="mt-2 text-sm text-slate-600">
            Quản lý điểm danh và hoạt động của nhân sự.
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Thanh toán</h2>
          <p className="mt-2 text-sm text-slate-600">
            Theo dõi giao dịch và hoàn tiền sau khi tính năng được triển khai.
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Quản lý workshop</h2>
          <p className="mt-2 text-sm text-slate-600">Tạo, chỉnh sửa, xuất bản, hủy workshop và quản lý các buổi học.</p>
          <div className="mt-3">
            <a href="/admin/workshops" className="inline-flex items-center rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700">Mở trang quản lý workshop</a>
          </div>
        </div>
      </div>
    </section>
  );
}
