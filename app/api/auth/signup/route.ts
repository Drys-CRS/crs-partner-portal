import { NextRequest, NextResponse } from "next/server";
import { createApplication } from "@/lib/monday";
import { sendApplicationConfirmation, sendAdminApplicationNotification } from "@/lib/resend";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, email, company, phone = "", message = "" } = body;

  if (!name?.trim() || !email?.trim() || !company?.trim()) {
    return NextResponse.json({ error: "Name, email, and company are required." }, { status: 400 });
  }
  if (!/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  await createApplication(name.trim(), email.trim().toLowerCase(), company.trim(), phone.trim(), message.trim());

  await Promise.all([
    sendApplicationConfirmation(email.trim().toLowerCase(), name.trim()),
    sendAdminApplicationNotification(name.trim(), email.trim().toLowerCase(), company.trim(), phone.trim(), message.trim()),
  ]);

  return NextResponse.json({ ok: true }, { status: 201 });
}
