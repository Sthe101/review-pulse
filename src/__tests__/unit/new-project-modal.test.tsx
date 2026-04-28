import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const pushMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const insertMock = vi.hoisted(() => vi.fn());
const singleMock = vi.hoisted(() => vi.fn());
const profileFetchMock = vi.hoisted(() => vi.fn());
const profileUpdateMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock, success: toastSuccessMock },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "projects") {
        return {
          insert: (v: unknown) => {
            insertMock(v);
            return {
              select: () => ({ single: () => singleMock() }),
            };
          },
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: () => profileFetchMock() }),
          }),
          update: (v: unknown) => {
            profileUpdateMock(v);
            return {
              eq: () => Promise.resolve({ error: null }),
            };
          },
        };
      }
      return {};
    },
  }),
}));

import { NewProjectModal } from "@/components/projects/new-project-modal";

describe("NewProjectModal", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    insertMock.mockReset();
    singleMock.mockReset();
    profileFetchMock.mockReset();
    profileUpdateMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    profileFetchMock.mockResolvedValue({
      data: {
        onboarding_checklist: {
          account: true,
          survey: false,
          firstProject: false,
          firstAnalysis: false,
          firstExport: false,
        },
      },
      error: null,
    });
    singleMock.mockResolvedValue({
      data: { id: "p_new_1" },
      error: null,
    });
  });

  it("renders form fields when open=true (modal opens)", () => {
    render(<NewProjectModal open={true} onClose={() => {}} userId="u_1" />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^description$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^industry$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/review source/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create project/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeNull();
    // Sanity: closed state renders nothing
  });

  it("does not render when open=false", () => {
    render(<NewProjectModal open={false} onClose={() => {}} userId="u_1" />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("empty name → shows validation error and does not insert", async () => {
    render(<NewProjectModal open={true} onClose={() => {}} userId="u_1" />);
    fireEvent.click(screen.getByRole("button", { name: /create project/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/required/i);
    });
    expect(insertMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("name > 200 chars → rejected and does not insert", async () => {
    render(<NewProjectModal open={true} onClose={() => {}} userId="u_1" />);
    const input = screen.getByLabelText(/project name/i);
    const longName = "a".repeat(201);
    fireEvent.change(input, { target: { value: longName } });

    fireEvent.click(screen.getByRole("button", { name: /create project/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/200|fewer/i);
    });
    expect(insertMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("successful create → inserts to DB and pushes to /projects/[id]", async () => {
    const onClose = vi.fn();
    render(<NewProjectModal open={true} onClose={onClose} userId="u_42" />);

    fireEvent.change(screen.getByLabelText(/project name/i), {
      target: { value: "ShopEase Reviews" },
    });
    fireEvent.change(screen.getByLabelText(/^description$/i), {
      target: { value: "E-commerce reviews from Google" },
    });
    fireEvent.change(screen.getByLabelText(/^industry$/i), {
      target: { value: "SaaS" },
    });
    fireEvent.change(screen.getByLabelText(/review source/i), {
      target: { value: "Google" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create project/i }));

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(1);
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u_42",
        name: "ShopEase Reviews",
        description: "E-commerce reviews from Google",
        industry: "SaaS",
        review_source: "Google",
        is_demo: false,
      })
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/projects/p_new_1");
    });
    expect(toastSuccessMock).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
