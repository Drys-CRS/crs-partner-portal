import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/adminAuth";
import pool from "@/lib/db";
import mammoth from "mammoth";

export const runtime = "nodejs";

const TEXT_EXTENSIONS  = [".txt", ".md", ".csv"];
const DOCX_EXTENSIONS  = [".docx", ".doc"];
const PDF_EXTENSIONS   = [".pdf"];
// Still unsupported
const UNSUPPORTED_EXTENSIONS = [".xlsx", ".pptx", ".ppt", ".xls"];

function isSyncable(ext: string) {
  return TEXT_EXTENSIONS.includes(ext) || DOCX_EXTENSIONS.includes(ext) || PDF_EXTENSIONS.includes(ext);
}

async function getGraphToken(): Promise<string> {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Azure credentials not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET.");
  }

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description ?? "Failed to get Graph token");
  }

  const data = await res.json();
  return data.access_token as string;
}

async function getSharePointSiteId(token: string, siteUrl: string): Promise<string> {
  const url = new URL(siteUrl);
  const hostname = url.hostname;
  const sitePath = url.pathname; // e.g. /sites/CRSCyberSecurity

  const graphUrl = `https://graph.microsoft.com/v1.0/sites/${hostname}:${sitePath}`;
  const res = await fetch(graphUrl, { headers: { Authorization: `Bearer ${token}` } });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err?.error?.message ?? err?.error?.code ?? `HTTP ${res.status}`;
    throw new Error(`SharePoint site lookup failed (${detail}). Check SHAREPOINT_SITE_URL and that admin consent is granted for Sites.Read.All.`);
  }

  const data = await res.json();
  return data.id as string;
}

async function getDriveId(token: string, siteId: string, driveName?: string): Promise<string> {
  if (!driveName) return "drive"; // use the site's default drive

  // List all drives/document-libraries on the site and find by name
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives?$select=id,name`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error("Could not list SharePoint document libraries.");
  const data = await res.json();
  const match = (data.value as Array<{ id: string; name: string }>)
    .find(d => d.name.toLowerCase() === driveName.toLowerCase());
  if (!match) {
    const names = (data.value as Array<{ name: string }>).map(d => d.name).join(", ");
    throw new Error(`Library "${driveName}" not found. Available libraries: ${names}`);
  }
  return match.id;
}

type RawItem = {
  id: string; name: string; size: number; webUrl: string;
  lastModifiedDateTime: string; file?: object; folder?: object;
};

// Recursively collect all files under a folder item ID
async function listFilesRecursive(
  token: string,
  siteId: string,
  driveRef: string,
  itemId: string,
  folderPath: string,
): Promise<SPFileItem[]> {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/${driveRef}/items/${itemId}/children?$select=id,name,size,webUrl,lastModifiedDateTime,file,folder`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];

  const data = await res.json();
  const items = (data.value as RawItem[]);
  const results: SPFileItem[] = [];

  for (const item of items) {
    if (item.folder) {
      if (item.name.toLowerCase() === "do not use") continue;
      const children = await listFilesRecursive(token, siteId, driveRef, item.id, `${folderPath}/${item.name}`);
      results.push(...children);
    } else if (item.file) {
      const ext = item.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
      const syncable = isSyncable(ext);
      const reason = UNSUPPORTED_EXTENSIONS.includes(ext)
        ? "Excel/PowerPoint — paste content manually"
        : syncable ? undefined : "Unknown format";
      results.push({
        id: item.id,
        name: item.name,
        folder: folderPath,
        size: item.size,
        webUrl: item.webUrl,
        lastModified: item.lastModifiedDateTime,
        syncable,
        reason,
      });
    }
  }

  return results;
}

type SPFileItem = {
  id: string; name: string; folder: string; size: number;
  webUrl: string; lastModified: string; syncable: boolean; reason?: string;
};

// GET — recursively list all files under configured SharePoint folder
export async function GET() {
  const admin = await requireAdmin(await headers());
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const siteUrl = process.env.SHAREPOINT_SITE_URL;
  const folderPath = process.env.SHAREPOINT_FOLDER_PATH;
  const driveName = process.env.SHAREPOINT_DRIVE_NAME;

  if (!siteUrl || !folderPath) {
    return NextResponse.json({
      error: "SHAREPOINT_SITE_URL and SHAREPOINT_FOLDER_PATH are not configured.",
      files: [],
    }, { status: 503 });
  }

  let token: string;
  try { token = await getGraphToken(); }
  catch (e: unknown) { return NextResponse.json({ error: (e as Error).message }, { status: 503 }); }

  let siteId: string;
  try { siteId = await getSharePointSiteId(token, siteUrl); }
  catch (e: unknown) { return NextResponse.json({ error: (e as Error).message }, { status: 503 }); }

  let driveRef: string;
  try {
    const driveId = await getDriveId(token, siteId, driveName);
    driveRef = driveId === "drive" ? "drive" : `drives/${driveId}`;
  } catch (e: unknown) { return NextResponse.json({ error: (e as Error).message }, { status: 503 }); }

  // Resolve the root folder item ID
  const normPath = folderPath.replace(/\\/g, "/").replace(/^([^/])/, "/$1");
  const rootRes = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/${driveRef}/root:${normPath}?$select=id,name`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!rootRes.ok) {
    const err = await rootRes.json().catch(() => ({}));
    return NextResponse.json({ error: err.error?.message ?? "Failed to find SharePoint folder." }, { status: 502 });
  }
  const rootItem = await rootRes.json();

  // Recursively collect all files
  const files = await listFilesRecursive(token, siteId, driveRef, rootItem.id, normPath);

  return NextResponse.json({ files });
}

// POST — sync a single file into the knowledge base
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(await headers());
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { fileId, fileName, fileUrl } = await req.json().catch(() => ({}));
  if (!fileId || !fileName) {
    return NextResponse.json({ error: "fileId and fileName required" }, { status: 400 });
  }

  const siteUrl = process.env.SHAREPOINT_SITE_URL;
  if (!siteUrl) {
    return NextResponse.json({ error: "SharePoint not configured." }, { status: 503 });
  }

  let token: string;
  try {
    token = await getGraphToken();
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }

  let siteId: string;
  try {
    siteId = await getSharePointSiteId(token, siteUrl);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }

  let driveRef: string;
  try {
    const driveId = await getDriveId(token, siteId, process.env.SHAREPOINT_DRIVE_NAME);
    driveRef = driveId === "drive" ? "drive" : `drives/${driveId}`;
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }

  const ext = fileName.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  let content: string;

  const fileEndpoint = `https://graph.microsoft.com/v1.0/sites/${siteId}/${driveRef}/items/${fileId}/content`;

  const fileRes = await fetch(fileEndpoint, { headers: { Authorization: `Bearer ${token}` } });
  if (!fileRes.ok) return NextResponse.json({ error: `Failed to download file (HTTP ${fileRes.status}).` }, { status: 502 });
  const buffer = Buffer.from(await fileRes.arrayBuffer());

  if (TEXT_EXTENSIONS.includes(ext)) {
    content = buffer.toString("utf-8").trim();

  } else if (DOCX_EXTENSIONS.includes(ext)) {
    const result = await mammoth.extractRawText({ buffer });
    content = result.value.trim();
    if (!content) return NextResponse.json({ error: "Word document appears to be empty." }, { status: 400 });

  } else if (PDF_EXTENSIONS.includes(ext)) {
    // Dynamic import avoids pdf-parse test-file read at module load time
    const { default: pdfParse } = await import("pdf-parse") as unknown as { default: (buf: Buffer) => Promise<{ text: string }> };
    const result = await pdfParse(buffer);
    content = result.text.trim();
    if (!content) return NextResponse.json({ error: "PDF appears to have no extractable text (may be scanned image)." }, { status: 400 });

  } else {
    return NextResponse.json({
      error: `"${ext}" files cannot be auto-extracted. Copy the text and add it manually as a KB entry.`,
    }, { status: 400 });
  }

  // Upsert into knowledge_base (update if same source_url exists)
  await pool.query(
    `INSERT INTO knowledge_base (name, source, source_url, content, updated_at)
     VALUES ($1, 'sharepoint', $2, $3, NOW())
     ON CONFLICT (source_url) DO UPDATE
       SET name = EXCLUDED.name, content = EXCLUDED.content, updated_at = NOW()`,
    [fileName, fileUrl, content]
  );

  return NextResponse.json({ ok: true });
}
