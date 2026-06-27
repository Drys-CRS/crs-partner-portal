import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const url = searchParams.get("url");
  const name = searchParams.get("name") ?? "download";

  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  let decoded: string;
  try {
    decoded = decodeURIComponent(url);
    new URL(decoded); // validate it's a real URL
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  // Pre-signed S3 URLs carry auth in query params (X-Amz-Signature).
  // Adding an Authorization header alongside pre-signed auth causes AWS to reject with 400.
  // Only inject the Monday API key for direct monday.com API URLs that are NOT pre-signed.
  const isMondayUrl = /monday\.com|files-monday-com/i.test(decoded);
  const isPreSigned = /X-Amz-Signature/i.test(decoded);
  const fetchHeaders: Record<string, string> = {};
  if (isMondayUrl && !isPreSigned && process.env.MONDAY_API_KEY) {
    fetchHeaders["Authorization"] = process.env.MONDAY_API_KEY;
  }

  const upstream = await fetch(decoded, { headers: fetchHeaders });
  if (!upstream.ok) {
    return NextResponse.json({ error: "upstream fetch failed" }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
