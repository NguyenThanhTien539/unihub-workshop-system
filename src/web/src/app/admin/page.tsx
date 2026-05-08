export default function AdminPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-700">
          Admin
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Operations dashboard
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Placeholder for organizer tools such as check-in, payments, and
          workshop management.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Check-in</h2>
          <p className="mt-2 text-sm text-slate-600">
            Manage attendance and staff operations.
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Payments</h2>
          <p className="mt-2 text-sm text-slate-600">
            Monitor transactions and refunds once implemented.
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Workshop Management</h2>
          <p className="mt-2 text-sm text-slate-600">Create, edit, publish and cancel workshops; manage sessions.</p>
          <div className="mt-3">
            <a href="/admin/workshops" className="inline-flex items-center rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700">Open Workshop Admin</a>
          </div>
        </div>
      </div>
    </section>
  );
}
