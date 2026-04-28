import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { SentimentBar } from "@/components/ui/sentiment-bar";
import { ProjectListClient } from "@/components/projects/project-list-client";
import type { Industry } from "@/types/database";

export const metadata = {
  title: "Projects",
};

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  industry: Industry;
  review_source: string;
  is_demo: boolean;
  updated_at: string;
};

type ReviewRow = { project_id: string };

type AnalysisRow = {
  project_id: string;
  sentiment_positive: number | null;
  sentiment_neutral: number | null;
  sentiment_negative: number | null;
  overall_score: number | null;
  created_at: string;
};

type ProjectStats = {
  reviewCount: number;
  analysisCount: number;
  latest: AnalysisRow | null;
};

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const diffMs = Date.now() - then;
  const sec = Math.max(0, Math.round(diffMs / 1000));
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mon = Math.round(day / 30);
  if (mon < 12) return `${mon}mo ago`;
  const yr = Math.round(mon / 12);
  return `${yr}y ago`;
}

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/projects");

  const projectsRes = (await (
    supabase.from("projects") as unknown as {
      select: (cols: string) => {
        order: (
          col: string,
          opts: { ascending: boolean }
        ) => Promise<{ data: ProjectRow[] | null; error: unknown }>;
      };
    }
  )
    .select("id, name, description, industry, review_source, is_demo, updated_at")
    .order("updated_at", { ascending: false })) as {
    data: ProjectRow[] | null;
    error: unknown;
  };

  const projects = projectsRes.data ?? [];

  const [reviewsRes, analysesRes] = await Promise.all([
    (supabase.from("reviews") as unknown as {
      select: (cols: string) => Promise<{
        data: ReviewRow[] | null;
        error: unknown;
      }>;
    }).select("project_id"),
    (
      supabase.from("analyses") as unknown as {
        select: (cols: string) => {
          order: (
            col: string,
            opts: { ascending: boolean }
          ) => Promise<{ data: AnalysisRow[] | null; error: unknown }>;
        };
      }
    )
      .select(
        "project_id, sentiment_positive, sentiment_neutral, sentiment_negative, overall_score, created_at"
      )
      .order("created_at", { ascending: false }),
  ]);

  const reviewsByProject = new Map<string, number>();
  for (const r of reviewsRes.data ?? []) {
    reviewsByProject.set(r.project_id, (reviewsByProject.get(r.project_id) ?? 0) + 1);
  }

  const latestByProject = new Map<string, AnalysisRow>();
  const analysisCountByProject = new Map<string, number>();
  for (const a of analysesRes.data ?? []) {
    analysisCountByProject.set(
      a.project_id,
      (analysisCountByProject.get(a.project_id) ?? 0) + 1
    );
    if (!latestByProject.has(a.project_id)) {
      latestByProject.set(a.project_id, a);
    }
  }

  const stats: Map<string, ProjectStats> = new Map(
    projects.map((p) => [
      p.id,
      {
        reviewCount: reviewsByProject.get(p.id) ?? 0,
        analysisCount: analysisCountByProject.get(p.id) ?? 0,
        latest: latestByProject.get(p.id) ?? null,
      },
    ])
  );

  return (
    <ProjectListClient userId={user.id} hasProjects={projects.length > 0}>
      {projects.length > 0 && (
        <div
          data-testid="projects-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {projects.map((p) => {
            const s = stats.get(p.id);
            return (
              <ProjectCard
                key={p.id}
                project={p}
                stats={s ?? { reviewCount: 0, analysisCount: 0, latest: null }}
              />
            );
          })}
        </div>
      )}
    </ProjectListClient>
  );
}

function ProjectCard({
  project,
  stats,
}: {
  project: ProjectRow;
  stats: ProjectStats;
}) {
  const score =
    stats.latest && typeof stats.latest.overall_score === "number"
      ? Math.round(stats.latest.overall_score)
      : null;

  const positive = stats.latest?.sentiment_positive ?? 0;
  const neutral = stats.latest?.sentiment_neutral ?? 0;
  const negative = stats.latest?.sentiment_negative ?? 0;
  const hasSentiment = positive + neutral + negative > 0;

  const scoreVariant: "pos" | "warn" | "neg" =
    score === null ? "warn" : score >= 70 ? "pos" : score >= 50 ? "warn" : "neg";

  return (
    <Link
      href={`/projects/${project.id}`}
      data-testid={`project-card-${project.id}`}
      data-demo={project.is_demo ? "true" : "false"}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <Card
        clickable
        padding={20}
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          border: project.is_demo
            ? "1.5px dashed var(--teal)"
            : "1px solid var(--bd)",
          background: project.is_demo
            ? "color-mix(in srgb, var(--teal) 4%, transparent)"
            : undefined,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "color-mix(in srgb, var(--navy) 10%, transparent)",
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <Icon name="folder" size={16} color="var(--navy)" />
            </span>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--tx)",
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {project.name}
            </div>
          </div>
          {project.is_demo && (
            <Badge variant="teal" style={{ fontSize: 10, flexShrink: 0 }}>
              Demo
            </Badge>
          )}
        </div>

        {project.description && (
          <p
            style={{
              fontSize: 13,
              color: "var(--tx2)",
              lineHeight: 1.5,
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {project.description}
          </p>
        )}

        <div style={{ fontSize: 12, color: "var(--tx3)" }}>
          {stats.reviewCount} {stats.reviewCount === 1 ? "review" : "reviews"} ·{" "}
          {stats.analysisCount}{" "}
          {stats.analysisCount === 1 ? "analysis" : "analyses"} ·{" "}
          {formatRelative(project.updated_at)}
        </div>

        {hasSentiment ? (
          <SentimentBar
            positive={positive}
            neutral={neutral}
            negative={negative}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              height: 8,
              borderRadius: 99,
              background: "var(--bd)",
            }}
          />
        )}

        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginTop: "auto",
          }}
        >
          <Badge variant="navy">{project.industry}</Badge>
          <Badge variant="teal">{project.review_source}</Badge>
          {score !== null && (
            <Badge variant={scoreVariant}>Score: {score}</Badge>
          )}
        </div>
      </Card>
    </Link>
  );
}
