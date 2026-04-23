// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const exchangeCodeMock = vi.hoisted(() => vi.fn());
const getUserMock = vi.hoisted(() => vi.fn());
const maybeSingleMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: exchangeCodeMock,
      getUser: getUserMock,
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: maybeSingleMock,
        }),
      }),
    }),
  }),
}));

import { GET } from "@/app/(auth)/callback/route";

function buildRequest(pathAndQuery: string): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${pathAndQuery}`));
}

describe("GET /callback", () => {
  beforeEach(() => {
    exchangeCodeMock.mockReset();
    getUserMock.mockReset();
    maybeSingleMock.mockReset();
  });

  it("exchanges a valid code and redirects based on onboarding status", async () => {
    exchangeCodeMock.mockResolvedValue({ data: {}, error: null });
    getUserMock.mockResolvedValue({
      data: { user: { id: "u_1" } },
      error: null,
    });
    maybeSingleMock.mockResolvedValue({
      data: { onboarding_checklist: { survey: true } },
      error: null,
    });

    const res = await GET(buildRequest("/callback?code=valid_code_123"));

    expect(exchangeCodeMock).toHaveBeenCalledWith("valid_code_123");
    expect([301, 302, 303, 307, 308]).toContain(res.status);

    const location = res.headers.get("Location");
    expect(location).not.toBeNull();
    expect(new URL(location!).pathname).toBe("/dashboard");
  });

  it("routes new users (survey not completed) to /onboarding", async () => {
    exchangeCodeMock.mockResolvedValue({ data: {}, error: null });
    getUserMock.mockResolvedValue({
      data: { user: { id: "u_2" } },
      error: null,
    });
    maybeSingleMock.mockResolvedValue({
      data: { onboarding_checklist: { survey: false } },
      error: null,
    });

    const res = await GET(buildRequest("/callback?code=valid_code_xyz"));

    const location = res.headers.get("Location");
    expect(new URL(location!).pathname).toBe("/onboarding");
  });

  it("redirects to /login?error=auth_failed when code exchange fails", async () => {
    exchangeCodeMock.mockResolvedValue({
      data: {},
      error: { message: "invalid grant" },
    });

    const res = await GET(buildRequest("/callback?code=bad_code"));

    expect([301, 302, 303, 307, 308]).toContain(res.status);

    const location = res.headers.get("Location");
    expect(location).not.toBeNull();
    const url = new URL(location!);
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("error")).toMatch(/auth/);

    // Must not continue to fetch user / profile when exchange failed.
    expect(getUserMock).not.toHaveBeenCalled();
    expect(maybeSingleMock).not.toHaveBeenCalled();
  });

  it("redirects to /login?error=missing_code when no code query param is present", async () => {
    const res = await GET(buildRequest("/callback"));

    const location = res.headers.get("Location");
    const url = new URL(location!);
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("error")).toBe("missing_code");
    expect(exchangeCodeMock).not.toHaveBeenCalled();
  });
});
