import { NextRequest, NextResponse } from "next/server";
import { createSubmission } from "@/lib/monday";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Must be an authenticated partner
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (!cookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { await verifyToken(cookie); } catch {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const { name, email, message } = await req.json().catch(() => ({}));
  if (!name || !email || !message) {
    return NextResponse.json({ error: "name, email, and message are required" }, { status: 400 });
  }

  const id = await createSubmission(name, email, message);
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
