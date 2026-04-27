import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import MarketingHome from "@/app/(marketing)/page";
import { FAQ, type FaqItem } from "@/components/marketing/faq";

describe("Marketing landing page", () => {
  it("renders the h1 with 'Unfair Advantage'", () => {
    render(<MarketingHome />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent(/turn customer reviews/i);
    expect(h1).toHaveTextContent(/unfair advantage/i);
  });

  it("shows pricing cards with $0, $29, and $79", () => {
    render(<MarketingHome />);
    expect(screen.getByText("$0")).toBeInTheDocument();
    expect(screen.getByText("$29")).toBeInTheDocument();
    expect(screen.getByText("$79")).toBeInTheDocument();
  });

  it("Pro pricing card shows the 'Most Popular' badge", () => {
    render(<MarketingHome />);
    expect(screen.getByText(/most popular/i)).toBeInTheDocument();
  });

  it("CTA buttons all link to /signup (hero + 3 pricing + final CTA = 5)", () => {
    render(<MarketingHome />);
    const signupLinks = screen
      .getAllByRole("link")
      .filter((l) => l.getAttribute("href") === "/signup");
    expect(signupLinks.length).toBeGreaterThanOrEqual(5);
  });

  it("does NOT render a 'Watch Demo' button", () => {
    render(<MarketingHome />);
    expect(screen.queryByText(/watch demo/i)).toBeNull();
  });

  it("hero secondary CTA is 'See How It Works' anchored to #how-it-works", () => {
    render(<MarketingHome />);
    const link = screen.getByRole("link", { name: /see how it works/i });
    expect(link).toHaveAttribute("href", "#how-it-works");
  });
});

describe("FAQ accordion", () => {
  const items: FaqItem[] = [
    { q: "First question?", a: "First answer body." },
    { q: "Second question?", a: "Second answer body." },
    { q: "Third question?", a: "Third answer body." },
  ];

  it("each item starts collapsed (aria-expanded=false, no answer rendered)", () => {
    render(<FAQ items={items} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    buttons.forEach((b) => expect(b).toHaveAttribute("aria-expanded", "false"));
    expect(screen.queryByText("First answer body.")).toBeNull();
  });

  it("clicking an item toggles it expanded then collapsed", () => {
    render(<FAQ items={items} />);
    const btn = screen.getByRole("button", { name: /first question/i });

    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("First answer body.")).toBeInTheDocument();

    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("First answer body.")).toBeNull();
  });

  it("clicking different items independently swaps the open panel (single-open)", () => {
    render(<FAQ items={items} />);
    const btn1 = screen.getByRole("button", { name: /first question/i });
    const btn2 = screen.getByRole("button", { name: /second question/i });

    fireEvent.click(btn1);
    expect(screen.getByText("First answer body.")).toBeInTheDocument();
    expect(screen.queryByText("Second answer body.")).toBeNull();

    fireEvent.click(btn2);
    expect(btn2).toHaveAttribute("aria-expanded", "true");
    expect(btn1).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Second answer body.")).toBeInTheDocument();
    expect(screen.queryByText("First answer body.")).toBeNull();
  });

  it("each panel's region is wired to its button via aria-controls", () => {
    render(<FAQ items={items} />);
    const btn = screen.getByRole("button", { name: /first question/i });
    fireEvent.click(btn);
    const panelId = btn.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    const panel = document.getElementById(panelId!);
    expect(panel).not.toBeNull();
    expect(within(panel!).getByText("First answer body.")).toBeInTheDocument();
  });
});
