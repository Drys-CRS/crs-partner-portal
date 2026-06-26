import { NextRequest, NextResponse } from "next/server";
import { findPartnerByEmail } from "@/lib/monday";
import { signToken } from "@/lib/auth";
import { sendMagicLink } from "@/lib/resend";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));

  if (!email || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  let partner;
  try {
    partner = await findPartnerByEmail(email.toLowerCase().trim());
  } catch (err) {
    console.error("[login] Monday.com lookup failed:", err);
    return NextResponse.json({ error: "Failed to verify partner. Please try again." }, { status: 500 });
  }

  if (!partner) {
    // No matching partner with a valid tier — still return 200 to avoid enumeration
    console.log("[login] No partner found for:", email);
    return NextResponse.json({ ok: true });
  }

  let token;
  try {
    token = await signToken({ email: partner.email, tier: partner.tier, name: partner.name });
  } catch (err) {
    console.error("[login] Token signing failed:", err);
    return NextResponse.json({ error: "Authentication error. Please try again." }, { status: 500 });
  }

  try {
    await sendMagicLink(partner.email, partner.name, token);
  } catch (err) {
    console.error("[login] Resend failed:", err);
    return NextResponse.json({ error: "Failed to send login email. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
