import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import mammoth from "mammoth";
import FirecrawlApp from "firecrawl";
import { getContent } from "@/lib/monday";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min — syncing many files takes time

// ── Auth ─────────────────────────────────────────────────────────────────────

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

// ── Graph API helpers ─────────────────────────────────────────────────────────

async function getGraphToken(): Promise<string> {
  const { AZURE_TENANT_ID: tenantId, AZURE_CLIENT_ID: clientId, AZURE_CLIENT_SECRET: clientSecret } = process.env;
  if (!tenantId || !clientId || !clientSecret) throw new Error("Azure credentials not configured.");
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret, scope: "https://graph.microsoft.com/.default" }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error_description ?? "Graph token failed"); }
  return (await res.json()).access_token as string;
}

async function getSharePointSiteId(token: string, siteUrl: string): Promise<string> {
  const url = new URL(siteUrl);
  const res = await fetch(`https://graph.microsoft.com/v1.0/sites/${url.hostname}:${url.pathname}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message ?? "SP site lookup failed"); }
  return (await res.json()).id as string;
}

async function getDriveRef(token: string, siteId: string, driveName?: string): Promise<string> {
  if (!driveName) return "drive";
  const res = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drives?$select=id,name`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Could not list SP drives.");
  const data = await res.json();
  const match = (data.value as { id: string; name: string }[]).find(d => d.name.toLowerCase() === driveName.toLowerCase());
  if (!match) throw new Error(`Drive "${driveName}" not found.`);
  return `drives/${match.id}`;
}

type RawItem = { id: string; name: string; size: number; webUrl: string; lastModifiedDateTime: string; file?: object; folder?: object };
type SPFile  = { id: string; name: string; webUrl: string; ext: string };

async function listFilesRecursive(token: string, siteId: string, driveRef: string, itemId: string): Promise<SPFile[]> {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/${driveRef}/items/${itemId}/children?$select=id,name,size,webUrl,lastModifiedDateTime,file,folder`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const items = (await res.json()).value as RawItem[];
  const results: SPFile[] = [];
  for (const item of items) {
    if (item.folder) {
      if (item.name.toLowerCase().includes("do not use")) continue;
      results.push(...await listFilesRecursive(token, siteId, driveRef, item.id));
    } else if (item.file) {
      const ext = item.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
      results.push({ id: item.id, name: item.name, webUrl: item.webUrl, ext });
    }
  }
  return results;
}

const TEXT_EXTS = [".txt", ".md", ".csv"];
const DOCX_EXTS = [".docx", ".doc"];
const PDF_EXTS  = [".pdf"];

function isSyncable(ext: string) {
  return TEXT_EXTS.includes(ext) || DOCX_EXTS.includes(ext) || PDF_EXTS.includes(ext);
}

function sanitize(text: string): string {
  return text.replace(/\0/g, "").replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

// ── SharePoint sync ───────────────────────────────────────────────────────────

async function syncSharePoint(): Promise<{ synced: number; errors: string[] }> {
  const siteUrl   = process.env.SHAREPOINT_SITE_URL;
  const folderPath = process.env.SHAREPOINT_FOLDER_PATH;
  const driveName = process.env.SHAREPOINT_DRIVE_NAME;
  if (!siteUrl || !folderPath) throw new Error("SHAREPOINT_SITE_URL / SHAREPOINT_FOLDER_PATH not set.");

  const token   = await getGraphToken();
  const siteId  = await getSharePointSiteId(token, siteUrl);
  const driveRef = await getDriveRef(token, siteId, driveName);

  const normPath = folderPath.replace(/\\/g, "/").replace(/^([^/])/, "/$1");
  const rootRes  = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/${driveRef}/root:${normPath}?$select=id`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!rootRes.ok) throw new Error("Failed to find SP root folder.");
  const rootId = (await rootRes.json()).id as string;

  const files = (await listFilesRecursive(token, siteId, driveRef, rootId)).filter(f => isSyncable(f.ext));

  let synced = 0;
  const errors: string[] = [];

  for (const file of files) {
    try {
      const fileRes = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/${driveRef}/items/${file.id}/content`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!fileRes.ok) throw new Error(`HTTP ${fileRes.status}`);
      const buffer = Buffer.from(await fileRes.arrayBuffer());

      let content: string;
      if (TEXT_EXTS.includes(file.ext)) {
        content = sanitize(buffer.toString("utf-8"));
      } else if (DOCX_EXTS.includes(file.ext)) {
        const result = await mammoth.extractRawText({ buffer });
        content = sanitize(result.value);
      } else {
        const { default: pdfParse } = await import("pdf-parse") as unknown as { default: (buf: Buffer) => Promise<{ text: string }> };
        const _warn = console.warn;
        console.warn = (...a: unknown[]) => { if (typeof a[0] === "string" && a[0].startsWith("TT:")) return; _warn(...a); };
        const pdfResult = await pdfParse(buffer).finally(() => { console.warn = _warn; });
        content = sanitize(pdfResult.text);
      }

      if (!content) continue;

      await pool.query(
        `INSERT INTO knowledge_base (name, source, source_url, content, updated_at)
         VALUES ($1, 'sharepoint', $2, $3, NOW())
         ON CONFLICT (source_url) DO UPDATE SET name=EXCLUDED.name, content=EXCLUDED.content, updated_at=NOW()`,
        [file.name, file.webUrl, content]
      );
      synced++;
    } catch (e: unknown) {
      errors.push(`${file.name}: ${(e as Error).message}`);
    }
  }

  return { synced, errors };
}

// ── Vendor site sync ──────────────────────────────────────────────────────────

async function syncVendorSites(): Promise<{ synced: number; errors: string[] }> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not configured.");

  const items  = await getContent();
  const seen   = new Set<string>();
  const unique = items.filter(i => { if (!i.content || seen.has(i.content)) return false; seen.add(i.content); return true; });

  const firecrawl = new FirecrawlApp({ apiKey });
  let synced = 0;
  const errors: string[] = [];

  for (const item of unique) {
    try {
      const result = await firecrawl.scrapeUrl(item.content, { formats: ["markdown"] });
      const content = (result.markdown ?? "").slice(0, 15000).trim();
      if (!content) continue;

      await pool.query(
        `INSERT INTO knowledge_base (name, source, source_url, content, updated_at)
         VALUES ($1, 'vendor_site', $2, $3, NOW())
         ON CONFLICT (source_url) DO UPDATE SET name=EXCLUDED.name, content=EXCLUDED.content, updated_at=NOW()`,
        [`${item.group} — ${item.title}`, item.content, content]
      );
      synced++;
    } catch (e: unknown) {
      errors.push(`${item.title}: ${(e as Error).message}`);
    }
  }

  return { synced, errors };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const log: string[] = [];
  const ts = () => new Date().toISOString();

  // SharePoint
  let spResult = { synced: 0, errors: [] as string[] };
  try {
    log.push(`[${ts()}] Starting SharePoint sync…`);
    spResult = await syncSharePoint();
    log.push(`[${ts()}] SharePoint: synced ${spResult.synced} files, ${spResult.errors.length} errors`);
    if (spResult.errors.length) log.push(...spResult.errors.map(e => `  SP ERR: ${e}`));
  } catch (e: unknown) {
    log.push(`[${ts()}] SharePoint sync failed: ${(e as Error).message}`);
  }

  // Vendor sites
  let vsResult = { synced: 0, errors: [] as string[] };
  try {
    log.push(`[${ts()}] Starting vendor site sync…`);
    vsResult = await syncVendorSites();
    log.push(`[${ts()}] Vendor sites: synced ${vsResult.synced}, ${vsResult.errors.length} errors`);
    if (vsResult.errors.length) log.push(...vsResult.errors.map(e => `  VS ERR: ${e}`));
  } catch (e: unknown) {
    log.push(`[${ts()}] Vendor site sync failed: ${(e as Error).message}`);
  }

  log.push(`[${ts()}] Nightly sync complete. KB is up to date for the AI agent.`);

  return NextResponse.json({
    ok: true,
    sharepoint: { synced: spResult.synced, errors: spResult.errors.length },
    vendorSites: { synced: vsResult.synced, errors: vsResult.errors.length },
    log,
  });
}
