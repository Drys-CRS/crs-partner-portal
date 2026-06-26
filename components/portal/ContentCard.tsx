import { FileText, Link as LinkIcon, ExternalLink, Download } from "lucide-react";

type Props = {
  id: string;
  title: string;
  description: string;
  content: string;
  documentUrl?: string;
  documentName?: string;
};

export default function ContentCard({ title, description, content, documentUrl, documentName }: Props) {
  const isLink = !documentUrl && content;
  const icon = documentUrl
    ? <FileText className="h-4 w-4 shrink-0" />
    : <LinkIcon className="h-4 w-4 shrink-0" />;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 flex flex-col gap-3 hover:border-amber-700/50 transition-colors">
      <div className="flex items-center gap-2 text-amber-500/80">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">
          {documentUrl ? "Document" : "Link"}
        </span>
      </div>

      <h3 className="font-semibold text-white leading-snug">{title}</h3>

      {description && (
        <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">{description}</p>
      )}

      <div className="mt-auto pt-3 border-t border-slate-700/60">
        {documentUrl ? (
          <a
            href={documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={documentName}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
        ) : isLink ? (
          <a
            href={content}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors"
          >
            Visit <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
    </div>
  );
}
