import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/adminAuth";
import pool from "@/lib/db";
import mammoth from "mammoth";

export const runtime = "nodejs";
export const maxDuration = 300;

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitize(text: string): string {
  return text.replace(/\0/g, "").replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

const TEXT_EXTS = [".txt", ".md", ".csv"];
const DOCX_EXTS = [".docx", ".doc"];
const PDF_EXTS  = [".pdf"];

async function getGraphToken(): Promise<string> {
  const { AZURE_TENANT_ID: tid, AZURE_CLIENT_ID: cid, AZURE_CLIENT_SECRET: csec } = process.env;
  if (!tid || !cid || !csec) throw new Error("Azure credentials not configured.");
  const res = await fetch(`https://login.microsoftonline.com/${tid}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: cid, client_secret: csec, scope: "https://graph.microsoft.com/.default" }),
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

// ── Per-file processing ───────────────────────────────────────────────────────

type FileReq  = { id: string; name: string; webUrl: string };
type FileResult = { fileName: string; ok: boolean; skipped: boolean; error?: string };

async function processFile(file: FileReq, token: string, siteId: string, driveRef: string): Promise<FileResult> {
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";

  const fileRes = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/${driveRef}/items/${file.id}/content`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!fileRes.ok) {
    return { fileName: file.name, ok: false, skipped: false, error: `Download failed (HTTP ${fileRes.status})` };
  }

  const buffer = Buffer.from(await fileRes.arrayBuffer());
  let content = "";

  try {
    if (TEXT_EXTS.includes(ext)) {
      content = sanitize(buffer.toString("utf-8"));
    } else if (DOCX_EXTS.includes(ext)) {
      const result = await mammoth.extractRawText({ buffer });
      content = sanitize(result.value);
    } else if (PDF_EXTS.includes(ext)) {
      const { extractPdfText } = await import("@/lib/pdfExtract");
      content = await extractPdfText(buffer);
    }
  } catch (e: unknown) {
    return { fileName: file.name, ok: false, skipped: false, error: (e as Error).message };
  }

  if (!content) {
    return { fileName: file.name, ok: false, skipped: true, error: "no extractable text after AI analysis" };
  }

  await pool.query(
    `INSERT INTO knowledge_base (name, source, source_url, content, updated_at)
     VALUES ($1, 'sharepoint', $2, $3, NOW())
     ON CONFLICT (source_url) DO UPDATE SET name=EXCLUDED.name, content=EXCLUDED.content, updated_at=NOW()`,
    [file.name, file.webUrl, content]
  );

  return { fileName: file.name, ok: true, skipped: false };
}

// ── Handler ───────────────────────────────────────────────────────────────────

const CONCURRENCY = 5;

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(await headers());
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as { files?: FileReq[] };
  const files = body.files ?? [];
  if (!files.length) return NextResponse.json({ results: [] });

  const siteUrl = process.env.SHAREPOINT_SITE_URL;
  if (!siteUrl) return NextResponse.json({ error: "SharePoint not configured." }, { status: 503 });

  // Authenticate once for the whole batch
  let token: string, siteId: string, driveRef: string;
  try {
    token    = await getGraphToken();
    siteId   = await getSharePointSiteId(token, siteUrl);
    driveRef = await getDriveRef(token, siteId, process.env.SHAREPOINT_DRIVE_NAME);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }

  // Process CONCURRENCY files at a time in parallel
  const results: FileResult[] = [];
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(f => processFile(f, token, siteId, driveRef)));
    results.push(...batchResults);
  }

  return NextResponse.json({ results });
}
