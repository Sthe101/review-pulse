import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description: "Tips and case studies on customer review analysis.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <article style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px", textAlign: "center" }}>
      <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 16 }}>Blog</h1>
      <p style={{ fontSize: 16, color: "var(--tx2)", lineHeight: 1.7 }}>
        We&apos;re cooking up posts on review analysis playbooks, AI prompting techniques, and
        case studies. Check back soon.
      </p>
    </article>
  );
}
