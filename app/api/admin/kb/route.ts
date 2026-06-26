import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/adminAuth";
import pool from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin(await headers());
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rows } = await pool.query(
    "SELECT id, name, source, source_url, content, updated_at FROM knowledge_base ORDER BY updated_at DESC"
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(await headers());
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, content, source = "manual", source_url = null } = await req.json().catch(() => ({}));
  if (!name || !content) return NextResponse.json({ error: "name and content required" }, { status: 400 });

  const { rows } = await pool.query(
    "INSERT INTO knowledge_base (name, source, source_url, content) VALUES ($1, $2, $3, $4) RETURNING *",
    [name, source, source_url, content]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
