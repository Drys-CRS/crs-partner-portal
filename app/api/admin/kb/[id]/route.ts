import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/adminAuth";
import pool from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(await headers());
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await pool.query("DELETE FROM knowledge_base WHERE id = $1", [id]);
  return new NextResponse(null, { status: 204 });
}
