import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
import type { ReactNode } from "react";

export default async function PortalLayout({
  children,
  searchParams,
}: {
  children: ReactNode;
  searchParams: Promise<{ token?: string }>;
}) {
  const cookieStore = await cookies();
  const params = await searchParams;
  const magicToken = params?.token;

  // ── Magic link first-load: exchange token for session cookie ────────────────
  if (magicToken) {
    try {
      await verifyToken(magicToken);
      // Token valid — set long-lived session cookie and redirect to clean URL
      cookieStore.set(SESSION_COOKIE, magicToken, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge:   SESSION_MAX_AGE,
        path:     "/",
      });
      redirect("/portal");
    } catch {
      redirect("/login?error=expired");
    }
  }

  // ── Ongoing session: verify cookie ─────────────────────────────────────────
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) redirect("/login");

  try {
    await verifyToken(session);
  } catch {
    redirect("/login?error=expired");
  }

  return <>{children}</>;
}
