// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(),
}));

import { middleware } from "@/middleware";
import { updateSession } from "@/lib/supabase/middleware";

const mockUpdateSession = vi.mocked(updateSession);

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${pathname}`));
}

function sessionResult(user: unknown) {
  return {
    supabaseResponse: NextResponse.next(),
    user,
  } as Awaited<ReturnType<typeof updateSession>>;
}

const fakeUser = { id: "user_123", email: "test@reviewpulse.test" };

const REDIRECT_STATUSES = [301, 302, 307, 308];

describe("middleware", () => {
  beforeEach(() => {
    mockUpdateSession.mockReset();
  });

  it("redirects unauthenticated request to /dashboard → /login", async () => {
    mockUpdateSession.mockResolvedValue(sessionResult(null));

    const res = await middleware(makeRequest("/dashboard"));

    expect(REDIRECT_STATUSES).toContain(res.status);
    const location = res.headers.get("location");
    expect(location).toBeTruthy();
    expect(new URL(location!).pathname).toBe("/login");
    expect(new URL(location!).searchParams.get("next")).toBe("/dashboard");
  });

  it("redirects authenticated request to /login → /dashboard", async () => {
    mockUpdateSession.mockResolvedValue(sessionResult(fakeUser));

    const res = await middleware(makeRequest("/login"));

    expect(REDIRECT_STATUSES).toContain(res.status);
    const location = res.headers.get("location");
    expect(location).toBeTruthy();
    expect(new URL(location!).pathname).toBe("/dashboard");
  });

  it("passes through /api/stripe/webhook without touching Supabase", async () => {
    const res = await middleware(makeRequest("/api/stripe/webhook"));

    expect(mockUpdateSession).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBeNull();
  });

  it("passes through /report/abc without touching Supabase", async () => {
    const res = await middleware(makeRequest("/report/abc"));

    expect(mockUpdateSession).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBeNull();
  });

  it("passes through / (landing) regardless of auth state", async () => {
    mockUpdateSession.mockResolvedValueOnce(sessionResult(null));
    const resUnauth = await middleware(makeRequest("/"));
    expect(resUnauth.headers.get("location")).toBeNull();

    mockUpdateSession.mockResolvedValueOnce(sessionResult(fakeUser));
    const resAuth = await middleware(makeRequest("/"));
    expect(resAuth.headers.get("location")).toBeNull();

    expect(mockUpdateSession).toHaveBeenCalledTimes(2);
  });
});
