"use client";
import { FileText, ExternalLink, Download, Loader2 } from "lucide-react";
import { useState } from "react";

type Props = {
  id: string;
  title: string;
  description: string;
  content: string;
  documentUrl?: string;
  documentName?: string;
};

export default function ContentCard({ title, description, content, documentUrl, documentName }: Props) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!documentUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/download?url=${encodeURIComponent(documentUrl)}&name=${encodeURIComponent(documentName ?? title)}`);
      if (!res.ok) throw new Error("download failed");
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = documentName ?? title;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch {
      alert("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 rounded-lg p-2 ${documentUrl ? "bg-blue-50 dark:bg-blue-950/40" : "bg-gold-50 dark:bg-slate-800"}`}>
          {documentUrl
            ? <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            : <ExternalLink className="h-4 w-4 text-gold-600 dark:text-gold-400" />}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-snug text-slate-900 dark:text-white">{title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{documentUrl ? "Document" : "Link"}</p>
        </div>
      </div>

      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">{description}</p>
      )}

      {documentUrl ? (
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="mt-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-60 w-full justify-center"
        >
          {downloading
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Downloading…</>
            : <><Download className="h-3.5 w-3.5" /> Download</>}
        </button>
      ) : content ? (
        <a
          href={content}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-gold-400 hover:text-gold-700 dark:hover:text-gold-400 text-xs font-semibold transition-colors w-full justify-center"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Visit
        </a>
      ) : null}
    </div>
  );
}
