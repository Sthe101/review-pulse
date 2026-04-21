import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/projects",
  "/trends",
  "/integrations",
  "/settings",
  "/billing",
];

const AUTH_PAGES = new Set(["/login", "/signup"]);

const BYPASS_PREFIXES = ["/api/stripe/webhook", "/api/cron", "/report"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (matchesPrefix(pathname, BYPASS_PREFIXES)) {
    return NextResponse.next();
  }

  const { supabaseResponse, user } = await updateSession(request);

  if (!user && matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie);
    });
    return redirect;
  }

  if (user && AUTH_PAGES.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie);
    });
    return redirect;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
