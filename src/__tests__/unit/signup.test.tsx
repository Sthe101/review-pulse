import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const pushMock = vi.hoisted(() => vi.fn());
const signUpMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signUp: signUpMock },
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock },
}));

import SignupPage from "@/app/(auth)/signup/page";

describe("SignupPage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    signUpMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("renders name, email, and password fields", () => {
    render(<SignupPage />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("shows validation errors for all fields on empty submit", async () => {
    render(<SignupPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /create account/i })
    );

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("shows minimum-length error when password is under 8 chars", async () => {
    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Jane" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "jane@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "short" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /create account/i })
    );

    expect(
      await screen.findByText(/at least 8 characters/i)
    ).toBeInTheDocument();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("shows valid-email error when email format is wrong", async () => {
    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Jane" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "not-an-email" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Abcdefg1!" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /create account/i })
    );

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("strength bar shows 1/4 for short password and 4/4 for strong password", () => {
    render(<SignupPage />);
    const pwInput = screen.getByLabelText(/password/i);

    fireEvent.change(pwInput, { target: { value: "abc" } });
    let bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "1");
    expect(bar).toHaveAttribute("aria-valuemax", "4");

    fireEvent.change(pwInput, { target: { value: "Abcdefg1!" } });
    bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "4");
  });

  it("renders the Google OAuth button", () => {
    render(<SignupPage />);
    expect(screen.getByText(/or continue with/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();
  });

  it("calls supabase.auth.signUp with correct args on successful submit", async () => {
    signUpMock.mockResolvedValue({
      data: {
        user: { id: "u_123", identities: [{ id: "i_1" }] },
        session: null,
      },
      error: null,
    });

    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Jane Doe" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "jane@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Abcdefg1!" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /create account/i })
    );

    await waitFor(() => expect(signUpMock).toHaveBeenCalledTimes(1));
    expect(signUpMock).toHaveBeenCalledWith({
      email: "jane@example.com",
      password: "Abcdefg1!",
      options: { data: { full_name: "Jane Doe" } },
    });
  });
});
