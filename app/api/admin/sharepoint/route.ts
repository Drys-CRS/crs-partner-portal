import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/adminAuth";
import pool from "@/lib/db";

export const runtime = "nodejs";

// File extensions we can read as plain text
const TEXT_EXTENSIONS = [".txt", ".md", ".csv"];
// Office extensions Graph can convert to text
const OFFICE_EXTENSIONS = [".docx", ".doc", ".xlsx", ".pptx"];

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
  const sitePath = url.pathname; // e.g. /sites/crs

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${hostname}:${sitePath}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error("Could not resolve SharePoint site. Check SHAREPOINT_SITE_URL.");
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

// GET — list files in configured SharePoint folder
export async function GET() {
  const admin = await requireAdmin(await headers());
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const siteUrl = process.env.SHAREPOINT_SITE_URL;
  const folderPath = process.env.SHAREPOINT_FOLDER_PATH;
  const driveName = process.env.SHAREPOINT_DRIVE_NAME; // optional — document library name

  if (!siteUrl || !folderPath) {
    return NextResponse.json({
      error: "SHAREPOINT_SITE_URL and SHAREPOINT_FOLDER_PATH are not configured.",
      files: [],
    }, { status: 503 });
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
    const driveId = await getDriveId(token, siteId, driveName);
    driveRef = driveId === "drive" ? "drive" : `drives/${driveId}`;
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }

  // List children of the folder — normalise path separators
  const normPath = folderPath.replace(/\\/g, "/").replace(/^([^/])/, "/$1");
  const listRes = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/${driveRef}/root:${normPath}:/children?$select=id,name,size,webUrl,lastModifiedDateTime,file`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}));
    return NextResponse.json({ error: err.error?.message ?? "Failed to list SharePoint folder." }, { status: 502 });
  }

  const data = await listRes.json();
  const files = (data.value as Array<{
    id: string; name: string; size: number; webUrl: string;
    lastModifiedDateTime: string; file?: object;
  }>)
    .filter(item => item.file) // only files, not sub-folders
    .map(item => {
      const ext = item.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
      return {
        id: item.id,
        name: item.name,
        size: item.size,
        webUrl: item.webUrl,
        lastModified: item.lastModifiedDateTime,
        syncable: TEXT_EXTENSIONS.includes(ext) || OFFICE_EXTENSIONS.includes(ext),
      };
    });

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

  if (TEXT_EXTENSIONS.includes(ext)) {
    // Read raw text
    const contentRes = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/${driveRef}/items/${fileId}/content`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!contentRes.ok) return NextResponse.json({ error: "Failed to read file content." }, { status: 502 });
    content = await contentRes.text();
  } else if (OFFICE_EXTENSIONS.includes(ext)) {
    // Convert to HTML then strip tags for text
    const htmlRes = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/${driveRef}/items/${fileId}/content?format=html`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!htmlRes.ok) return NextResponse.json({ error: "Failed to convert Office document." }, { status: 502 });
    const html = await htmlRes.text();
    // Strip HTML tags to get plain text
    content = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  } else {
    return NextResponse.json({ error: `File type "${ext}" is not supported for text extraction.` }, { status: 400 });
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
