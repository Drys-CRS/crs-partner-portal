import { NextRequest, NextResponse } from "next/server";
import { createPartnerFromApplication } from "@/lib/monday";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  // Monday.com sends a challenge when first registering a webhook
  if (body.challenge) {
    return NextResponse.json({ challenge: body.challenge });
  }

  const event = body.event;
  if (!event) return NextResponse.json({ ok: true });

  const applicationsBoardId = process.env.MONDAY_APPLICATIONS_BOARD_ID;

  if (
    String(event.boardId) !== applicationsBoardId ||
    event.columnId !== "color_mm4p6kfw"
  ) {
    return NextResponse.json({ ok: true });
  }

  // value.label.text = "Approved" (Monday.com webhook payload structure)
  const labelText: string = event.value?.label?.text ?? event.value?.text ?? "";
  if (labelText !== "Approved") {
    return NextResponse.json({ ok: true });
  }

  const itemId = String(event.itemId ?? event.pulseId ?? "");
  if (itemId) {
    await createPartnerFromApplication(itemId).catch(console.error);
  }

  return NextResponse.json({ ok: true });
}
