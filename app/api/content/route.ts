import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getContent } from "@/lib/monday";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const content = await getContent();
  return NextResponse.json({
    content,
    user: { email: session.user.email, name: session.user.name },
  });
}
