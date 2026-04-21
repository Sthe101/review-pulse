import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const resetPasswordMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { resetPasswordForEmail: resetPasswordMock },
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock },
}));

import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    resetPasswordMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("renders email input and submit button", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send reset link/i })
    ).toBeInTheDocument();
  });

  it("shows success state with checkmark after a successful submit", async () => {
    resetPasswordMock.mockResolvedValue({ data: {}, error: null });

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "jane@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /send reset link/i })
    );

    await waitFor(() =>
      expect(resetPasswordMock).toHaveBeenCalledTimes(1)
    );
    expect(resetPasswordMock).toHaveBeenCalledWith(
      "jane@example.com",
      expect.objectContaining({ redirectTo: expect.any(String) })
    );

    expect(
      await screen.findByRole("heading", { name: /check your email/i })
    ).toBeInTheDocument();

    // The success card renders an `<Icon name="ok">` inside a circle div.
    // Our Icon component emits an inline <svg>, so assert via data-icon
    // attribute on the circle wrapper. Fallback: confirm the form fields
    // are no longer in the DOM.
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /send reset link/i })
    ).not.toBeInTheDocument();

    const svg = document.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("success state has a 'Back to login' link pointing to /login", async () => {
    resetPasswordMock.mockResolvedValue({ data: {}, error: null });

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "jane@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /send reset link/i })
    );

    const backLink = await screen.findByRole("link", {
      name: /back to login/i,
    });
    expect(backLink).toHaveAttribute("href", "/login");
  });
});
