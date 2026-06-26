import { FileText, Video, Link as LinkIcon, ExternalLink, Download } from "lucide-react";

type Props = {
  id: string;
  title: string;
  type: string;
  content: string;
  requiredTier: string;
  documentUrl?: string;
  documentName?: string;
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  Document: <FileText className="h-4 w-4" />,
  Video:    <Video    className="h-4 w-4" />,
  Link:     <LinkIcon className="h-4 w-4" />,
};

const TIER_BADGE: Record<string, string> = {
  Gold:   "bg-yellow-900/40 text-yellow-300 border-yellow-700",
  Silver: "bg-slate-700/40  text-slate-300  border-slate-600",
  Bronze: "bg-orange-900/40 text-orange-300 border-orange-700",
};

const isUrl = (s: string) => /^https?:\/\//.test(s);

export default function ContentCard({ title, type, content, requiredTier, documentUrl, documentName }: Props) {
  const icon  = TYPE_ICON[type] ?? <FileText className="h-4 w-4" />;
  const badge = TIER_BADGE[requiredTier] ?? "bg-slate-700/40 text-slate-300 border-slate-600";

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 flex flex-col gap-3 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-300">
          {icon}
          <span className="text-xs font-semibold uppercase tracking-wider">{type}</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge}`}>
          {requiredTier}
        </span>
      </div>

      <h3 className="font-semibold text-white leading-snug">{title}</h3>

      {isUrl(content) ? (
        <a href={content} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors">
          Open resource <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : content ? (
        <p className="text-sm text-slate-400 leading-relaxed line-clamp-4">{content}</p>
      ) : null}

      {documentUrl && (
        <a href={documentUrl} target="_blank" rel="noopener noreferrer" download={documentName}
          className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors mt-auto pt-1 border-t border-slate-700">
          <Download className="h-3.5 w-3.5" />
          {documentName ?? "Download document"}
        </a>
      )}
    </div>
  );
}
