"use client";
import {useState} from "react";
import {setTokens, ensureAdminAuth, fetchWithAuth} from "../../../../lib/adminAuth";

export default function CreateWorkshopPage() {
  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const ok = await ensureAdminAuth();
      if (!ok) { window.location.href = '/auth/login?role=organizer'; return; }

      const body = {title, speaker, description, status: "DRAFT", sessions: []};
      const res = await fetchWithAuth("/api/admin/workshops", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Create failed");
      const data = json?.data;
      const id = data?.id ?? data?.workshopId ?? data?.workshopId;
      if (id) {
        // store admin detail for immediate edit page load
        try { sessionStorage.setItem(`admin:workshop:${id}`, JSON.stringify(data)); } catch {}
        window.location.href = `/admin/workshops/${id}`;
      } else {
        setError("Unable to determine created workshop id");
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tạo Workshop mới</h1>
        <p className="text-sm text-slate-600">Điền thông tin workshop và lưu.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium">Tiêu đề</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Speaker</label>
          <input value={speaker} onChange={e => setSpeaker(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Mô tả</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" rows={6} />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex gap-2">
          <button type="submit" disabled={submitting} className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">{submitting? 'Saving...' : 'Create'}</button>
          <a href="/admin/workshops" className="inline-flex items-center rounded-md border px-4 py-2 text-sm">Cancel</a>
        </div>
      </form>
    </section>
  );
}
