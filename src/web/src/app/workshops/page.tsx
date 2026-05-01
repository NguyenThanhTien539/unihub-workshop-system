export default function WorkshopsPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-700">
          Workshops
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Browse upcoming sessions
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Placeholder list for workshop discovery, schedules, and registration
          entry points. Wire this to the backend when the API is ready.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            Intro to Product Design
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Example card for a workshop listing.
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            Cloud Foundations
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Add real data when the catalog service is implemented.
          </p>
        </div>
      </div>
    </section>
  );
}
