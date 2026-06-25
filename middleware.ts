import { NextRequest, NextResponse } from "next/server";
import { verifyToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (!pathname.startsWith("/portal")) return NextResponse.next();

  const magicToken = searchParams.get("token");
  const session = request.cookies.get(SESSION_COOKIE)?.value;

  // Exchange magic-link token for session cookie, then redirect to clean URL
  if (magicToken) {
    try {
      await verifyToken(magicToken);
      const url = request.nextUrl.clone();
      url.searchParams.delete("token");
      const response = NextResponse.redirect(url);
      response.cookies.set(SESSION_COOKIE, magicToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE,
        path: "/",
      });
      return response;
    } catch {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "?error=expired";
      return NextResponse.redirect(url);
    }
  }

  // No token — require a valid session cookie
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  try {
    await verifyToken(session);
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?error=expired";
    const response = NextResponse.redirect(url);
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*"],
};
