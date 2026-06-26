import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/adminAuth";
import { getContent } from "@/lib/monday";
import pool from "@/lib/db";

export const runtime = "nodejs";

function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 15000);
}

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

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CRS-KB-Bot/1.0)",
        Accept: "text/html,*/*",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (e: unknown) {
    return NextResponse.json({ error: `Fetch failed: ${(e as Error).message}` }, { status: 502 });
  }

  const content = extractText(html);
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
