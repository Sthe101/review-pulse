import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const pushMock = vi.hoisted(() => vi.fn());
const getUserMock = vi.hoisted(() => vi.fn());
const signOutMock = vi.hoisted(() => vi.fn());
const maybeSingleMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: getUserMock,
      signOut: signOutMock,
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

import { useUser } from "@/hooks/use-user";

describe("useUser", () => {
  beforeEach(() => {
    pushMock.mockReset();
    getUserMock.mockReset();
    signOutMock.mockReset();
    maybeSingleMock.mockReset();
  });

  it("returns isLoading true initially", () => {
    getUserMock.mockReturnValue(new Promise(() => {}));
    maybeSingleMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useUser());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("returns user + profile after fetch", async () => {
    const user = { id: "u_fetch_1", email: "jane@example.com" };
    const profile = {
      id: "u_fetch_1",
      onboarding_completed: true,
      plan: "free",
    };
    getUserMock.mockResolvedValue({ data: { user }, error: null });
    maybeSingleMock.mockResolvedValue({ data: profile, error: null });

    const { result } = renderHook(() => useUser());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toEqual(user);
    expect(result.current.profile).toEqual(profile);
    expect(result.current.error).toBeNull();
  });

  it("signOut calls supabase.auth.signOut and redirects to /", async () => {
    const user = { id: "u_signout_1", email: "bob@example.com" };
    getUserMock.mockResolvedValue({ data: { user }, error: null });
    maybeSingleMock.mockResolvedValue({
      data: { id: "u_signout_1", onboarding_completed: true },
      error: null,
    });
    signOutMock.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("returns error if fetch fails", async () => {
    getUserMock.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useUser());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toMatch(/network error/i);
    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
  });
});
