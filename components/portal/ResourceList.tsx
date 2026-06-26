import ContentCard from "./ContentCard";

type ContentItem = {
  id: string;
  title: string;
  type: string;
  content: string;
  documentUrl?: string;
  documentName?: string;
};

type Props = { items: ContentItem[] };

export default function ResourceList({ items }: Props) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-10 text-center">
        <p className="text-slate-500">No partner content has been added yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(item => (
        <ContentCard key={item.id} {...item} />
      ))}
    </div>
  );
}
