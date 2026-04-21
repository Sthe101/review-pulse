import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail open if Supabase isn't configured. Without this, a missing env var
  // on Vercel turns every request into MIDDLEWARE_INVOCATION_FAILED / 500.
  if (!url || !anonKey) {
    console.warn(
      "[middleware] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing; skipping session refresh."
    );
    return { supabaseResponse, user: null };
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  try {
    // Refreshes the auth token if expired and writes it back to the response.
    // Must be called before any other logic in middleware.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return { supabaseResponse, user };
  } catch (err) {
    console.error("[middleware] supabase.auth.getUser() failed:", err);
    return { supabaseResponse, user: null };
  }
}
