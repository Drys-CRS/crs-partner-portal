import { NextRequest, NextResponse } from "next/server";
import { createSubmission } from "@/lib/monday";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, email, message } = await req.json().catch(() => ({}));
  if (!name || !email || !message) {
    return NextResponse.json({ error: "name, email, and message are required" }, { status: 400 });
  }

  const id = await createSubmission(name, email, message);
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
