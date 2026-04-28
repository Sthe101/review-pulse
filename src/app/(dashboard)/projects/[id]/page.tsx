import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Industry } from "@/types/database";

export const metadata = {
  title: "Project",
};

type ProjectDetail = {
  id: string;
  name: string;
  description: string | null;
  industry: Industry;
  review_source: string;
  is_demo: boolean;
};

type ProjectQuery = {
  select: (cols: string) => {
    eq: (
      col: string,
      val: string
    ) => {
      maybeSingle: () => Promise<{
        data: ProjectDetail | null;
        error: unknown;
      }>;
    };
  };
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/projects/${id}`);

  const { data, error } = await (
    supabase.from("projects") as unknown as ProjectQuery
  )
    .select("id, name, description, industry, review_source, is_demo")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error("Failed to load project");
  if (!data) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <nav
        aria-label="Breadcrumb"
        data-testid="breadcrumb"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          color: "var(--tx3)",
        }}
      >
        <Link
          href="/projects"
          data-testid="breadcrumb-projects"
          style={{
            color: "var(--tx3)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Projects
        </Link>
        <span aria-hidden="true">/</span>
        <span style={{ color: "var(--tx2)" }}>{data.name}</span>
      </nav>

      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: "var(--tx)",
          margin: 0,
        }}
      >
        {data.name}
      </h1>

      {data.description && (
        <p style={{ color: "var(--tx2)", margin: 0, fontSize: 14, lineHeight: 1.5 }}>
          {data.description}
        </p>
      )}

      <div className="card" style={{ padding: 24 }}>
        <p style={{ color: "var(--tx2)", margin: 0, fontSize: 14 }}>
          Project detail view is coming soon. For now, you can return to the{" "}
          <Link
            href="/projects"
            style={{ color: "var(--teal)", fontWeight: 600 }}
          >
            projects list
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
