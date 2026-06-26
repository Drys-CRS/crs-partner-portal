import { NextRequest, NextResponse } from "next/server";
import pg from "pg";
import { findPartnerByEmail } from "@/lib/monday";
import { Resend } from "resend";

export const runtime = "nodejs";

// Simple secret check — remove this file once debugging is done
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("key") !== "crs-debug-2026") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const results: Record<string, unknown> = {
    env: {
      SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD ? "SET" : "MISSING",
      MONDAY_API_KEY: process.env.MONDAY_API_KEY ? "SET" : "MISSING",
      MONDAY_PARTNERS_BOARD_ID: process.env.MONDAY_PARTNERS_BOARD_ID ?? "MISSING",
      RESEND_API_KEY: process.env.RESEND_API_KEY ? "SET" : "MISSING",
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ?? "MISSING",
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ? "SET" : "MISSING",
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "MISSING",
    },
  };

  // Test Supabase DB connection
  try {
    const pool = new pg.Pool({
      host: "db.gstbkgkslqqqjfvghoxy.supabase.co",
      port: 5432,
      database: "postgres",
      user: "postgres",
      password: process.env.SUPABASE_DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
    });
    await pool.query("SELECT 1");
    await pool.end();
    results.db = "OK";
  } catch (e: unknown) {
    results.db = `FAIL: ${(e as Error).message}`;
  }

  // Test Monday.com partner lookup
  try {
    const partner = await findPartnerByEmail("drystan.govender@cyberretaliatorsolutions.com");
    results.monday = partner ? `OK: found ${partner.name}` : "NOT FOUND (email not on Partners board)";
  } catch (e: unknown) {
    results.monday = `FAIL: ${(e as Error).message}`;
  }

  // Test Resend (dry-run — check API key validity without sending)
  try {
    const r = new Resend(process.env.RESEND_API_KEY!);
    const { data, error } = await r.domains.list();
    results.resend = error
      ? `FAIL: ${error.message}`
      : `OK: ${data?.data?.map((d: { name: string }) => d.name).join(", ")}`;
  } catch (e: unknown) {
    results.resend = `FAIL: ${(e as Error).message}`;
  }

  return NextResponse.json(results, { status: 200 });
}
