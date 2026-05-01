export default function LoginPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-700">
          Login
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Sign in to UniHub
        </h1>
        <p className="max-w-xl text-sm leading-6 text-slate-600">
          Placeholder for the auth experience. Replace with real forms and
          identity providers later.
        </p>
      </div>
      <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          Authentication UI will live here.
        </p>
      </div>
    </section>
  );
}
