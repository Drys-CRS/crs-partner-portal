import { FileText, Video, Link as LinkIcon, ExternalLink, Download } from "lucide-react";

type Props = {
  id: string;
  title: string;
  type: string;
  content: string;
  documentUrl?: string;
  documentName?: string;
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  Document: <FileText className="h-4 w-4" />,
  Video:    <Video    className="h-4 w-4" />,
  Link:     <LinkIcon className="h-4 w-4" />,
};

const isUrl = (s: string) => /^https?:\/\//.test(s);

export default function ContentCard({ title, type, content, documentUrl, documentName }: Props) {
  const icon = TYPE_ICON[type] ?? <FileText className="h-4 w-4" />;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 flex flex-col gap-3 hover:border-slate-600 transition-colors">
      <div className="flex items-center gap-2 text-slate-300">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{type}</span>
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
