import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import type { Industry } from "@/types/database";

type RecentProject = {
  id: string;
  name: string;
  industry: Industry;
  is_demo: boolean;
  updated_at: string;
};

async function loadRecentProjects(): Promise<RecentProject[]> {
  const supabase = await createClient();
  const res = (await (
    supabase.from("projects") as unknown as {
      select: (cols: string) => {
        order: (
          col: string,
          opts: { ascending: boolean },
        ) => {
          limit: (n: number) => Promise<{
            data: RecentProject[] | null;
            error: unknown;
          }>;
        };
      };
    }
  )
    .select("id, name, industry, is_demo, updated_at")
    .order("updated_at", { ascending: false })
    .limit(3)) as {
    data: RecentProject[] | null;
    error: unknown;
  };

  return res.data ?? [];
}

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

export async function RecentProjects() {
  const projects = await loadRecentProjects();

  return (
    <section data-testid="recent-projects" aria-labelledby="recent-projects-h">
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <h2
          id="recent-projects-h"
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--tx)",
            margin: 0,
          }}
        >
          Recent Projects
        </h2>
        {projects.length > 0 && (
          <Link
            href="/projects"
            style={{
              fontSize: 13,
              color: "var(--teal)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            View all →
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        <EmptyProjects />
      ) : (
        <div
          data-testid="recent-projects-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </section>
  );
}

function ProjectCard({ project }: { project: RecentProject }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      data-testid={`project-card-${project.id}`}
      data-demo={project.is_demo ? "true" : "false"}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <Card
        padding={16}
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          border: project.is_demo
            ? "1.5px dashed var(--teal)"
            : "1px solid var(--bd)",
          background: project.is_demo
            ? "color-mix(in srgb, var(--teal) 4%, transparent)"
            : undefined,
          cursor: "pointer",
          transition: "transform 120ms ease, box-shadow 120ms ease",
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
          >
            <Icon name="folder" size={16} color="var(--navy)" />
          </span>
          {project.is_demo && (
            <Badge variant="teal" style={{ fontSize: 10 }}>
              Demo
            </Badge>
          )}
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--tx)",
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {project.name}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "auto",
            fontSize: 12,
            color: "var(--tx3)",
          }}
        >
          <span>{project.industry}</span>
          <span>{formatRelative(project.updated_at)}</span>
        </div>
      </Card>
    </Link>
  );
}

function EmptyProjects() {
  return (
    <div
      data-testid="recent-projects-empty"
      className="card"
      style={{
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "color-mix(in srgb, var(--teal) 10%, transparent)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
          color: "var(--teal)",
        }}
      >
        <Icon name="folder" size={24} color="var(--teal)" />
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "var(--tx)",
          marginBottom: 6,
        }}
      >
        No projects yet
      </div>
      <p
        style={{
          fontSize: 13,
          color: "var(--tx2)",
          maxWidth: 380,
          margin: "0 auto 16px",
          lineHeight: 1.5,
        }}
      >
        Paste reviews above for a quick analysis, or create a project to start
        tracking sentiment over time.
      </p>
      <Link
        href="/projects/new"
        className="btn btn-coral"
        style={{ padding: "10px 20px", fontSize: 14, textDecoration: "none" }}
      >
        Create First Project
      </Link>
    </div>
  );
}
