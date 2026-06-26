import ContentCard from "./ContentCard";

type ContentItem = {
  id: string;
  title: string;
  type: string;
  content: string;
  requiredTier: string;
  documentUrl?: string;
  documentName?: string;
};

type Props = { items: ContentItem[] };

const TIER_ORDER = ["Gold", "Silver", "Bronze"];

export default function ResourceList({ items }: Props) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-10 text-center">
        <p className="text-slate-500">No content available for your tier yet.</p>
      </div>
    );
  }

  // Group by tier in Gold → Silver → Bronze order
  const groups = TIER_ORDER.reduce<Record<string, ContentItem[]>>((acc, tier) => {
    const group = items.filter(i => i.requiredTier === tier);
    if (group.length) acc[tier] = group;
    return acc;
  }, {});

  return (
    <div className="space-y-10">
      {Object.entries(groups).map(([tier, groupItems]) => (
        <section key={tier}>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
            {tier} Resources
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupItems.map(item => (
              <ContentCard key={item.id} {...item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
