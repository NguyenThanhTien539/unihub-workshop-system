export default function Home() {
  return (
    <section className="grid gap-10">
      <div className="rounded-3xl border border-black/10 bg-white/80 p-8 shadow-sm sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-700">
          Scaffold
        </p>
        
        <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
          UniHub Workshop
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
          A clean starting point for the web app experience. This surface is
          wired to a local backend and ready for workshop discovery, check-in,
          and admin flows.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <span className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-medium text-slate-600">
            Next.js + TypeScript
          </span>
          <span className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-medium text-slate-600">
            Tailwind UI scaffold
          </span>
          <span className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-medium text-slate-600">
            API ready
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Workshops</h2>
          <p className="mt-2 text-sm text-slate-600">
            Public discovery, schedules, and registration entry points.
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Notifications
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Outbound updates for attendees and organizers.
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Admin Console
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Staff tooling for check-in, payments, and operations.
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Login</h2>
          <p className="mt-2 text-sm text-slate-600">
            Unified entry point for all user roles and devices.
          </p>
        </div>
      </div>
    </section>
  );
}
