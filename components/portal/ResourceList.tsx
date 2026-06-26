import ContentCard from "./ContentCard";

type ContentItem = {
  id: string;
  title: string;
  group: string;
  description: string;
  content: string;
  documentUrl?: string;
  documentName?: string;
};

type Props = { items: ContentItem[] };

export default function ResourceList({ items }: Props) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/30 px-6 py-10 text-center">
        <p className="text-slate-500 text-sm">No resources have been added for this solution yet.</p>
        <p className="text-slate-400 text-xs mt-1">
          Add items to this group in the Monday.com Content board to display them here.
        </p>
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
