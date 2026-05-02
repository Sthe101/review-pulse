"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type Props = {
  analysisId: string;
};

function filenameFrom(dispo: string | null, fallback: string): string {
  if (!dispo) return fallback;
  const m = dispo.match(/filename="?([^"]+)"?/i);
  return m?.[1] ?? fallback;
}

export function ExportCsvButton({ analysisId }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/export/${analysisId}?format=csv`,
        { method: "POST" },
      );
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        toast.error(detail?.error ?? "Couldn't export. Please try again.");
        return;
      }
      const blob = await res.blob();
      const filename = filenameFrom(
        res.headers.get("content-disposition"),
        "reviewpulse-export.csv",
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't export. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      data-testid="export-csv-button"
      onClick={handleClick}
      loading={loading}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Icon name="dl" size={14} />
        Export CSV
      </span>
    </Button>
  );
}
