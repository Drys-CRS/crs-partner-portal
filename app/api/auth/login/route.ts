import { NextRequest, NextResponse } from "next/server";
import { findPartnerByEmail } from "@/lib/monday";
import { signToken } from "@/lib/auth";
import { sendMagicLink } from "@/lib/sendgrid";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));

  if (!email || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const partner = await findPartnerByEmail(email.toLowerCase().trim()).catch(() => null);
  if (!partner) {
    // Return 200 to avoid email enumeration — client shows same message either way
    return NextResponse.json({ ok: true });
  }

  const token = await signToken({ email: partner.email, tier: partner.tier, name: partner.name });
  await sendMagicLink(partner.email, partner.name, token);

  return NextResponse.json({ ok: true });
}
