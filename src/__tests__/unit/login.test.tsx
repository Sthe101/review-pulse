import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const pushMock = vi.hoisted(() => vi.fn());
const signInMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const getSearchParamMock = vi.hoisted(() => vi.fn(() => null));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: getSearchParamMock }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signInWithPassword: signInMock },
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock },
}));

import LoginPage from "@/app/(auth)/login/page";

describe("LoginPage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    signInMock.mockReset();
    toastErrorMock.mockReset();
    getSearchParamMock.mockReset();
    getSearchParamMock.mockReturnValue(null);
  });

  it("renders email and password fields", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /log in/i })
    ).toBeInTheDocument();
  });

  it("calls signInWithPassword and redirects to /dashboard on success", async () => {
    signInMock.mockResolvedValue({
      data: {
        user: { id: "u_123" },
        session: { access_token: "tok" },
      },
      error: null,
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "jane@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Abcdefg1!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => expect(signInMock).toHaveBeenCalledTimes(1));
    expect(signInMock).toHaveBeenCalledWith({
      email: "jane@example.com",
      password: "Abcdefg1!",
    });
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/dashboard")
    );
  });

  it("shows generic error on failed login (no disclosure of which field was wrong)", async () => {
    signInMock.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        message: "Invalid login credentials",
        code: "invalid_credentials",
      },
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "jane@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrongpass" },
    });

    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(
      await screen.findByText(/invalid email or password/i)
    ).toBeInTheDocument();

    // Must not leak which side was wrong or echo Supabase's raw message.
    expect(screen.queryByText(/wrong password/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no account/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/user not found/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/invalid login credentials/i)).not.toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("renders 'Forgot password?' link pointing to /forgot-password", () => {
    render(<LoginPage />);
    const link = screen.getByRole("link", { name: /forgot password/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/forgot-password");
  });

  it("renders the Google OAuth button", () => {
    render(<LoginPage />);
    expect(screen.getByText(/or continue with/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();
  });
});
