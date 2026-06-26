import { auth } from "./auth";
import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map(e => e.trim())
    .filter(Boolean);
}

export async function requireAdmin(headersList: ReadonlyHeaders): Promise<{ email: string; name: string } | null> {
  const session = await auth.api.getSession({ headers: headersList });
  if (!session) return null;
  const admins = getAdminEmails();
  if (!admins.includes(session.user.email)) return null;
  return { email: session.user.email, name: session.user.name ?? "" };
}
