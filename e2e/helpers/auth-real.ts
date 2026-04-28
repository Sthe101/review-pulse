import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "auth-real requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getAnonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "auth-real requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return new URL(url).hostname.split(".")[0]!;
}

export interface RealTestUser {
  id: string;
  email: string;
  password: string;
  session: Session;
}

export async function createRealTestUser(): Promise<RealTestUser> {
  const admin = getAdminClient();
  const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const email = `e2e+${suffix}@reviewpulse.test`;
  const password = `E2EPass!${suffix}`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`createUser failed: ${error?.message}`);
  }

  // Sign in via the anon-key client to obtain a real session JWT — used both
  // to seed data under the user's RLS context and to inject a server-readable
  // auth cookie into the Playwright browser.
  const anon = getAnonClient();
  const { data: signInData, error: signInErr } =
    await anon.auth.signInWithPassword({ email, password });
  if (signInErr || !signInData.session) {
    throw new Error(`signIn after createUser failed: ${signInErr?.message}`);
  }

  return {
    id: data.user.id,
    email,
    password,
    session: signInData.session,
  };
}

export async function deleteRealTestUser(userId: string): Promise<void> {
  const admin = getAdminClient();
  // CASCADE on auth.users → public.profiles, projects, reviews, analyses
  await admin.auth.admin.deleteUser(userId);
}

/**
 * Inject the @supabase/ssr-formatted auth cookie so server-rendered routes
 * (middleware, RSC) see the user as authenticated. Bypasses going through
 * the /login UI — that flow has a race where router.push('/dashboard') runs
 * before the browser cookie is observable to the next server request.
 */
export async function injectAuthCookie(
  page: Page,
  user: RealTestUser
): Promise<void> {
  const cookieName = `sb-${getProjectRef()}-auth-token`;
  const value =
    "base64-" + Buffer.from(JSON.stringify(user.session)).toString("base64url");
  await page.context().addCookies([
    {
      name: cookieName,
      value,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

export interface SeedProjectOptions {
  user: RealTestUser;
  name?: string;
  industry?: string;
  reviewSource?: string;
  isDemo?: boolean;
}

/**
 * Insert a project under the user's own auth context — this respects RLS
 * (passes the `user_id = auth.uid()` policy) and uses the standard
 * `authenticated` Postgres role, which has the GRANTs that may be missing
 * from `service_role` in this project's setup.
 *
 * Note: setting `global.headers.Authorization` does NOT change the JWT used
 * for PostgREST calls — supabase-js overrides it on each `.from()` call from
 * the auth state. Use `auth.setSession()` to actually authenticate the
 * client.
 */
export async function seedProject(
  options: SeedProjectOptions
): Promise<{ projectId: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await userClient.auth.setSession({
    access_token: options.user.session.access_token,
    refresh_token: options.user.session.refresh_token,
  });

  const { data, error } = await userClient
    .from("projects")
    .insert({
      user_id: options.user.id,
      name: options.name ?? "E2E Project",
      industry: options.industry ?? "SaaS",
      review_source: options.reviewSource ?? "Mixed",
      is_demo: options.isDemo ?? false,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`seedProject failed: ${error?.message}`);
  }
  return { projectId: (data as { id: string }).id };
}

export interface SeedReviewsOptions {
  user: RealTestUser;
  projectId: string;
  contents: string[];
}

/**
 * Insert reviews under the user's auth context — same auth pattern as
 * seedProject. Used by E2E specs that want reviews present without going
 * through the UI paste flow (faster, and avoids hitting the live analysis
 * endpoint).
 */
export async function seedReviews(
  options: SeedReviewsOptions
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await userClient.auth.setSession({
    access_token: options.user.session.access_token,
    refresh_token: options.user.session.refresh_token,
  });

  const rows = options.contents.map((content) => ({
    project_id: options.projectId,
    content,
  }));
  const { error } = await userClient.from("reviews").insert(rows);
  if (error) {
    throw new Error(`seedReviews failed: ${error.message}`);
  }
}
