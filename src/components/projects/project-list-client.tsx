"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { NewProjectModal } from "./new-project-modal";

type Props = {
  userId: string;
  hasProjects: boolean;
  children: ReactNode;
};

export function ProjectListClient({ userId, hasProjects, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "var(--tx)",
              margin: 0,
            }}
          >
            Projects
          </h1>
          <p
            style={{
              color: "var(--tx2)",
              marginTop: 4,
              fontSize: 14,
            }}
          >
            Group reviews and track sentiment over time.
          </p>
        </div>
        {hasProjects && (
          <Button
            variant="navy"
            onClick={() => setOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            data-testid="new-project-button"
          >
            <Icon name="plus" size={16} color="#fff" />
            New Project
          </Button>
        )}
      </div>

      {children}

      {!hasProjects && (
        <EmptyProjectsCta onCreate={() => setOpen(true)} />
      )}

      <NewProjectModal
        open={open}
        onClose={() => setOpen(false)}
        userId={userId}
      />
    </div>
  );
}

function EmptyProjectsCta({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      data-testid="projects-empty"
      className="card"
      style={{
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "color-mix(in srgb, var(--teal) 10%, transparent)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          color: "var(--teal)",
        }}
      >
        <Icon name="folder" size={28} color="var(--teal)" />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
        No projects yet
      </div>
      <p
        style={{
          fontSize: 14,
          color: "var(--tx2)",
          maxWidth: 380,
          margin: "0 auto 16px",
          lineHeight: 1.5,
        }}
      >
        Create a project to organize your reviews and track sentiment over time.
      </p>
      <Button
        variant="coral"
        onClick={onCreate}
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        data-testid="empty-new-project-button"
      >
        <Icon name="plus" size={16} color="#fff" />
        Create First Project
      </Button>
    </div>
  );
}
