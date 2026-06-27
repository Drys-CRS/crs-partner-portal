"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Database, RefreshCw, Plus, Trash2, Loader2, LogOut,
  FolderOpen, FileText, CheckCircle2, AlertCircle, BookOpen, Globe,
} from "lucide-react";

type KBEntry = {
  id: string;
  name: string;
  source: string;
  source_url: string | null;
  content: string;
  updated_at: string;
};

type SPFile = {
  id: string;
  name: string;
  folder: string;
  size: number;
  webUrl: string;
  lastModified: string;
  syncable: boolean;
  reason?: string;
};

type VendorSiteItem = {
  id: string;
  title: string;
  group: string;
  url: string;
};

type Props = { adminEmail: string };

export default function AdminDashboard({ adminEmail }: Props) {
  const [kbEntries, setKBEntries] = useState<KBEntry[]>([]);
  const [spFiles, setSPFiles] = useState<SPFile[]>([]);
  const [vendorItems, setVendorItems] = useState<VendorSiteItem[]>([]);
  const [loadingKB, setLoadingKB] = useState(true);
  const [loadingSP, setLoadingSP] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingVendor, setSyncingVendor] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [vendorBulkProgress, setVendorBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [newEntry, setNewEntry] = useState({ name: "", content: "" });
  const [addingEntry, setAddingEntry] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => { loadKB(); }, []);

  async function loadKB() {
    setLoadingKB(true);
    const res = await fetch("/api/admin/kb");
    if (res.ok) setKBEntries(await res.json());
    setLoadingKB(false);
  }

  async function loadSharePoint() {
    setLoadingSP(true);
    setMsg(null);
    const res = await fetch("/api/admin/sharepoint");
    const data = await res.json();
    if (res.ok) setSPFiles(data.files ?? []);
    else setMsg({ type: "err", text: data.error ?? "Failed to load SharePoint folder." });
    setLoadingSP(false);
    return res.ok ? (data.files ?? []) as SPFile[] : null;
  }

  async function browseAndSyncAll() {
    setMsg(null);
    setBulkProgress(null);
    const files = await loadSharePoint();
    if (!files) return;

    // Refresh KB list to get current synced URLs
    const kbRes = await fetch("/api/admin/kb");
    const currentKB: KBEntry[] = kbRes.ok ? await kbRes.json() : kbEntries;
    if (kbRes.ok) setKBEntries(currentKB);
    const syncedUrls = new Set(currentKB.map(e => e.source_url).filter(Boolean));

    const syncable = files.filter(f => f.syncable && !syncedUrls.has(f.webUrl));
    if (!syncable.length) {
      setMsg({ type: "ok", text: "All supported files are already synced — nothing to do." });
      return;
    }

    setBulkProgress({ done: 0, total: syncable.length });

    // Send in chunks of 10 so the server auths once per chunk and processes 5 files
    // in parallel within each chunk — progress bar advances after each chunk.
    const CHUNK = 10;
    let done = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < syncable.length; i += CHUNK) {
      const chunk = syncable.slice(i, i + CHUNK);
      const res = await fetch("/api/admin/sharepoint/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: chunk.map(f => ({ id: f.id, name: f.name, webUrl: f.webUrl })) }),
      });

      if (!res.ok) {
        // Whole chunk failed (auth error etc.) — mark each file as an error
        const data = await res.json().catch(() => ({}));
        errors.push(...chunk.map(f => `${f.name}: ${data.error ?? "batch failed"}`));
        done += chunk.length;
      } else {
        const data = await res.json();
        for (const r of (data.results ?? []) as { fileName: string; ok: boolean; skipped: boolean; error?: string }[]) {
          if (r.ok) {
            // synced
          } else if (r.skipped) {
            skipped++;
          } else {
            errors.push(`${r.fileName}: ${r.error ?? "failed"}`);
          }
          done++;
        }
      }
      setBulkProgress({ done, total: syncable.length });
    }

    setSyncing(null);
    setBulkProgress(null);
    loadKB();

    const synced = done - errors.length - skipped;
    const skipNote = skipped > 0 ? ` (${skipped} scanned/empty file${skipped !== 1 ? "s" : ""} skipped)` : "";
    if (errors.length) {
      setMsg({ type: "err", text: `Synced ${synced}/${syncable.length} files${skipNote}. Errors: ${errors.join("; ")}` });
    } else {
      setMsg({ type: "ok", text: `Successfully synced ${synced} file${synced !== 1 ? "s" : ""} into the knowledge base.${skipNote}` });
    }
  }

  async function syncFile(file: SPFile) {
    setSyncing(file.id);
    setMsg(null);
    const res = await fetch("/api/admin/sharepoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId: file.id, fileName: file.name, fileUrl: file.webUrl }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ type: "ok", text: `Synced "${file.name}" into knowledge base.` });
      loadKB();
    } else {
      setMsg({ type: "err", text: data.error ?? "Sync failed." });
    }
    setSyncing(null);
  }

  async function loadVendorSites() {
    setLoadingVendors(true);
    setMsg(null);
    const res = await fetch("/api/admin/vendor-sites");
    const data = await res.json();
    if (res.ok) setVendorItems(data.items ?? []);
    else setMsg({ type: "err", text: data.error ?? "Failed to load vendor sites." });
    setLoadingVendors(false);
    return res.ok ? (data.items ?? []) as VendorSiteItem[] : null;
  }

  async function syncVendorSite(item: VendorSiteItem) {
    setSyncingVendor(item.id);
    setMsg(null);
    const res = await fetch("/api/admin/vendor-sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: item.title, group: item.group, url: item.url }),
    });
    const data = await res.json();
    if (res.ok) { setMsg({ type: "ok", text: `Synced "${item.title}" into knowledge base.` }); loadKB(); }
    else setMsg({ type: "err", text: data.error ?? "Sync failed." });
    setSyncingVendor(null);
  }

  async function syncAllVendorSites() {
    setMsg(null);
    setVendorBulkProgress(null);
    const items = await loadVendorSites();
    if (!items) return;

    const kbRes = await fetch("/api/admin/kb");
    const currentKB: KBEntry[] = kbRes.ok ? await kbRes.json() : kbEntries;
    if (kbRes.ok) setKBEntries(currentKB);
    const syncedUrls = new Set(currentKB.map(e => e.source_url).filter(Boolean));

    const pending = items.filter(i => !syncedUrls.has(i.url));
    if (!pending.length) {
      setMsg({ type: "ok", text: "All vendor sites are already synced — nothing to do." });
      return;
    }

    setVendorBulkProgress({ done: 0, total: pending.length });
    let done = 0;
    const errors: string[] = [];

    for (const item of pending) {
      setSyncingVendor(item.id);
      const res = await fetch("/api/admin/vendor-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: item.title, group: item.group, url: item.url }),
      });
      const data = await res.json();
      if (!res.ok) errors.push(`${item.title}: ${data.error ?? "failed"}`);
      done++;
      setVendorBulkProgress({ done, total: pending.length });
    }

    setSyncingVendor(null);
    setVendorBulkProgress(null);
    loadKB();

    if (errors.length) setMsg({ type: "err", text: `Synced ${done - errors.length}/${pending.length}. Errors: ${errors.join("; ")}` });
    else setMsg({ type: "ok", text: `Successfully synced ${done} vendor site${done !== 1 ? "s" : ""} into the knowledge base.` });
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setAddingEntry(true);
    const res = await fetch("/api/admin/kb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEntry),
    });
    setAddingEntry(false);
    if (res.ok) {
      setNewEntry({ name: "", content: "" });
      setShowAddForm(false);
      loadKB();
      setMsg({ type: "ok", text: "Entry added." });
    } else {
      setMsg({ type: "err", text: "Failed to add entry." });
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this knowledge base entry?")) return;
    await fetch(`/api/admin/kb/${id}`, { method: "DELETE" });
    setKBEntries(p => p.filter(e => e.id !== id));
  }

  async function logout() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.location.href = "/login";
  }

  const spConfigured = true; // hide banner if env vars missing — API returns clear error

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/crs-logo.png" alt="CRS" width={36} height={36} className="h-8 w-auto" />
            <div>
              <span className="font-bold text-sm">Admin — Knowledge Base</span>
              <span className="text-xs text-slate-500 block">Not accessible to partners</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:block">{adminEmail}</span>
            <button onClick={logout} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-12">
        {/* Status message */}
        {msg && (
          <div className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
            msg.type === "ok"
              ? "bg-emerald-950/40 border border-emerald-800 text-emerald-400"
              : "bg-rose-950/40 border border-rose-800 text-rose-400"
          }`}>
            {msg.type === "ok" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {msg.text}
          </div>
        )}

        {/* ── SharePoint Browser ────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-gold-400" />
              <h2 className="text-lg font-bold">SharePoint Knowledge Base</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadSharePoint()}
                disabled={loadingSP || !!bulkProgress}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 transition-colors disabled:opacity-50"
              >
                {loadingSP ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Browse
              </button>
              <button
                onClick={browseAndSyncAll}
                disabled={loadingSP || !!bulkProgress}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-400 hover:bg-gold-300 text-slate-900 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {bulkProgress
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Syncing {bulkProgress.done}/{bulkProgress.total}…</>
                  : <><RefreshCw className="h-4 w-4" /> Browse &amp; Sync All</>}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400 mb-4">
            <p className="text-slate-300 font-medium mb-1">Configuration</p>
            <p>Set these environment variables to connect SharePoint:</p>
            <ul className="mt-2 space-y-0.5 font-mono text-xs text-slate-500">
              <li>AZURE_TENANT_ID — Azure AD tenant (from app registration)</li>
              <li>AZURE_CLIENT_ID — App client ID</li>
              <li>AZURE_CLIENT_SECRET — App client secret</li>
              <li>SHAREPOINT_SITE_URL — e.g. https://company.sharepoint.com/sites/crs</li>
              <li>SHAREPOINT_FOLDER_PATH — e.g. /Shared Documents/CRS Knowledge Base</li>
            </ul>
          </div>

          {spFiles.length > 0 && (
            <div className="space-y-2">
              {(() => {
                const syncedUrls = new Set(kbEntries.map(e => e.source_url).filter(Boolean));
                return spFiles.map(f => {
                  const alreadySynced = syncedUrls.has(f.webUrl);
                  return (
                  <div key={f.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{f.name}</p>
                        <p className="text-xs text-slate-500 truncate">{f.folder} · {(f.size / 1024).toFixed(1)} KB · {new Date(f.lastModified).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {alreadySynced ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-400 text-xs font-medium">
                          <CheckCircle2 className="h-3 w-3" /> Synced
                        </span>
                      ) : (
                        <button
                          onClick={() => syncFile(f)}
                          disabled={!f.syncable || syncing === f.id}
                          title={f.reason}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-400/20 hover:bg-gold-400/30 text-gold-400 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {syncing === f.id
                            ? <><Loader2 className="h-3 w-3 animate-spin" /> Syncing…</>
                            : f.syncable ? "Sync to KB" : "Not supported"}
                        </button>
                      )}
                      {!f.syncable && f.reason && (
                        <p className="text-xs text-slate-600 mt-0.5 max-w-[160px] leading-tight">{f.reason}</p>
                      )}
                    </div>
                  </div>
                  );
                });
              })()}
            </div>
          )}
        </section>

        {/* ── Vendor Sites ─────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-gold-400" />
              <h2 className="text-lg font-bold">Vendor Sites</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadVendorSites}
                disabled={loadingVendors || !!vendorBulkProgress}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 transition-colors disabled:opacity-50"
              >
                {loadingVendors ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Browse
              </button>
              <button
                onClick={syncAllVendorSites}
                disabled={loadingVendors || !!vendorBulkProgress}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-400 hover:bg-gold-300 text-slate-900 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {vendorBulkProgress
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Syncing {vendorBulkProgress.done}/{vendorBulkProgress.total}…</>
                  : <><RefreshCw className="h-4 w-4" /> Browse &amp; Sync All</>}
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-500 mb-4">
            Fetches the linked website for each solution on your Monday.com content board and indexes the page text into the knowledge base.
          </p>

          {vendorItems.length > 0 && (
            <div className="space-y-2">
              {(() => {
                const syncedUrls = new Set(kbEntries.map(e => e.source_url).filter(Boolean));
                return vendorItems.map(item => {
                  const alreadySynced = syncedUrls.has(item.url);
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Globe className="h-4 w-4 text-slate-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-xs text-slate-500 truncate">{item.group} · {item.url}</p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {alreadySynced ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-400 text-xs font-medium">
                            <CheckCircle2 className="h-3 w-3" /> Synced
                          </span>
                        ) : (
                          <button
                            onClick={() => syncVendorSite(item)}
                            disabled={syncingVendor === item.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-400/20 hover:bg-gold-400/30 text-gold-400 text-xs font-medium transition-colors disabled:opacity-40"
                          >
                            {syncingVendor === item.id
                              ? <><Loader2 className="h-3 w-3 animate-spin" /> Syncing…</>
                              : "Sync to KB"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </section>

        {/* ── Knowledge Base Entries ────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-gold-400" />
              <h2 className="text-lg font-bold">Knowledge Base Entries</h2>
              <span className="text-sm text-slate-500">({kbEntries.length})</span>
            </div>
            <button
              onClick={() => setShowAddForm(p => !p)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-400 hover:bg-gold-300 text-slate-900 text-sm font-semibold transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Entry
            </button>
          </div>

          <p className="text-sm text-slate-500 mb-4 flex items-start gap-2">
            <BookOpen className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
            These entries are passed to the AI Solution Matcher as additional context when analysing security requirements.
            Paste in product specs, competitive insights, case studies, or pricing guidance.
          </p>

          {/* Add Entry Form */}
          {showAddForm && (
            <form onSubmit={addEntry} className="rounded-xl border border-gold-400/30 bg-gold-950/10 p-5 mb-6 space-y-3">
              <h3 className="font-semibold text-sm text-gold-400">New KB Entry</h3>
              <input
                required
                value={newEntry.name}
                onChange={e => setNewEntry(p => ({ ...p, name: e.target.value }))}
                placeholder="Entry name / title (e.g. Vectra Competitive Intel Q1 2026)"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400"
              />
              <textarea
                required
                rows={6}
                value={newEntry.content}
                onChange={e => setNewEntry(p => ({ ...p, content: e.target.value }))}
                placeholder="Paste document content, product details, competitive notes, or any text you want Gemini to use when matching solutions…"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 resize-none"
              />
              <div className="flex gap-3">
                <button type="submit" disabled={addingEntry} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-400 hover:bg-gold-300 text-slate-900 text-sm font-semibold transition-colors disabled:opacity-50">
                  {addingEntry ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Adding…</> : "Add Entry"}
                </button>
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loadingKB ? (
            <div className="flex items-center gap-3 text-slate-400 py-10 justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-gold-400" />
              Loading…
            </div>
          ) : kbEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-6 py-10 text-center">
              <Database className="h-8 w-8 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No knowledge base entries yet.</p>
              <p className="text-slate-600 text-xs mt-1">Sync files from SharePoint or add entries manually.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {kbEntries.map(e => (
                <div key={e.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{e.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Source: {e.source} · Updated {new Date(e.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button onClick={() => deleteEntry(e.id)} className="shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-900/20 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-slate-400 line-clamp-3 whitespace-pre-wrap">{e.content}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
