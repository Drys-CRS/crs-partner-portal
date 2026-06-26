"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import ResourceList from "@/components/portal/ResourceList";
import { LogOut, Loader2 } from "lucide-react";

type User = { email: string; name: string; tier: string };
type ContentItem = { id: string; title: string; type: string; content: string; requiredTier: string };

const TIER_COLOURS: Record<string, string> = {
  Gold:   "bg-amber-900/40 text-amber-300 border-amber-700",
  Silver: "bg-slate-700/40  text-slate-300  border-slate-600",
  Bronze: "bg-orange-900/40 text-orange-300 border-orange-700",
};

export default function PortalPage() {
  const [user, setUser]       = useState<User | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const [form, setForm]       = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [formErr, setFormErr] = useState("");

  useEffect(() => {
    fetch("/api/content")
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setUser(d.user); setContent(d.content); })
      .catch(() => setError("Failed to load content. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setSending(true); setFormErr("");
    const res = await fetch("/api/submit-form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSending(false);
    if (res.ok) { setSent(true); setForm({ name: "", email: "", message: "" }); }
    else setFormErr("Submission failed — please try again.");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const tierColour = TIER_COLOURS[user?.tier ?? ""] ?? "bg-slate-700/40 text-slate-300 border-slate-600";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/crs-logo.png" alt="CRS" width={40} height={40} className="h-9 w-auto" />
            <span className="font-bold text-lg tracking-tight">Partner Portal</span>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <span className="text-sm text-slate-400 hidden sm:block">{user.email}</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${tierColour}`}>
                  {user.tier}
                </span>
              </>
            )}
            <button onClick={logout}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-12">
        {/* Welcome */}
        {user && (
          <div>
            <h1 className="text-2xl font-bold">Welcome back{user.name ? `, ${user.name}` : ""}</h1>
            <p className="mt-1 text-slate-400 text-sm">
              You have access to <strong className="text-amber-400">{user.tier}</strong>-tier content and above.
            </p>
          </div>
        )}

        {/* Content */}
        {loading && (
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-amber-400" /> Loading your content…
          </div>
        )}
        {error && <p className="text-rose-400">{error}</p>}
        {!loading && !error && <ResourceList items={content} />}

        {/* Contact form */}
        <section className="border-t border-slate-800 pt-10">
          <h2 className="text-lg font-semibold mb-1">Send a Message</h2>
          <p className="text-sm text-slate-400 mb-6">Need support or have a question for your account manager?</p>

          {sent ? (
            <div className="rounded-xl bg-amber-900/30 border border-amber-700 px-5 py-4 text-amber-300 text-sm">
              Message received — we&apos;ll be in touch shortly.
            </div>
          ) : (
            <form onSubmit={submitForm} className="space-y-4 max-w-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Name</label>
                  <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="Jane Smith" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Email</label>
                  <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="jane@company.com" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Message</label>
                <textarea required rows={4} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
                  placeholder="How can we help?" />
              </div>
              {formErr && <p className="text-rose-400 text-sm">{formErr}</p>}
              <button type="submit" disabled={sending}
                className="px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {sending ? "Sending…" : "Send Message"}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
