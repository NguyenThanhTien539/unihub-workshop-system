export default function NotificationsPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-700">
          Notifications
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Broadcast updates
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Placeholder for outbound notifications and messaging templates.
        </p>
      </div>
      <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          Wire this to the notification service when it is ready.
        </p>
      </div>
    </section>
  );
}
