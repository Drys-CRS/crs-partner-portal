import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/adminAuth";
import { getContent } from "@/lib/monday";
import pool from "@/lib/db";
import FirecrawlApp from "firecrawl";

export const runtime = "nodejs";

export type VendorSiteItem = {
  id: string;
  title: string;
  group: string;
  url: string;
};

// GET — return all Monday content items that have a link URL
export async function GET() {
  const admin = await requireAdmin(await headers());
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await getContent();
  const seen = new Set<string>();
  const result: VendorSiteItem[] = [];

  for (const item of items) {
    if (!item.content) continue;
    if (seen.has(item.content)) continue;
    seen.add(item.content);
    result.push({ id: item.id, title: item.title, group: item.group, url: item.content });
  }

  return NextResponse.json({ items: result });
}

// POST — fetch a vendor URL, extract text, upsert into knowledge_base
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(await headers());
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { title, group, url } = await req.json().catch(() => ({}));
  if (!url || !title) return NextResponse.json({ error: "url and title required" }, { status: 400 });

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "FIRECRAWL_API_KEY is not configured." }, { status: 503 });

  let content: string;
  try {
    const firecrawl = new FirecrawlApp({ apiKey });
    const result = await firecrawl.scrapeUrl(url, { formats: ["markdown"] });
    content = (result.markdown ?? "").slice(0, 15000).trim();
  } catch (e: unknown) {
    return NextResponse.json({ error: `Firecrawl error: ${(e as Error).message}` }, { status: 502 });
  }

  if (!content) return NextResponse.json({ error: "No text extracted from page." }, { status: 400 });

  await pool.query(
    `INSERT INTO knowledge_base (name, source, source_url, content, updated_at)
     VALUES ($1, 'vendor_site', $2, $3, NOW())
     ON CONFLICT (source_url) DO UPDATE
       SET name = EXCLUDED.name, content = EXCLUDED.content, updated_at = NOW()`,
    [`${group} — ${title}`, url, content],
  );

  return NextResponse.json({ ok: true });
}
