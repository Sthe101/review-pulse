"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type Props = {
  analysisId: string;
};

type ShareResponse = { url: string; token: string };

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export function ShareButton({ analysisId }: Props) {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ analysis_id: analysisId }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        toast.error(
          detail?.error ?? "Couldn't create share link. Please try again.",
        );
        return;
      }
      const body = (await res.json()) as ShareResponse;
      setShareUrl(body.url);
      const copied = await copyToClipboard(body.url);
      if (copied) {
        toast.success("Share link copied to clipboard.");
      } else {
        toast.success("Share link ready.");
      }
    } catch {
      toast.error("Couldn't create share link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      data-testid="share-button-wrap"
      style={{ display: "flex", alignItems: "center", gap: 8 }}
    >
      {shareUrl && (
        <input
          readOnly
          value={shareUrl}
          data-testid="share-url-input"
          aria-label="Share URL"
          onFocus={(e) => e.currentTarget.select()}
          style={{
            fontSize: 12,
            padding: "6px 10px",
            border: "1px solid var(--bd)",
            borderRadius: 6,
            background: "var(--bg2)",
            color: "var(--tx2)",
            minWidth: 240,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        />
      )}
      <Button
        variant="outline"
        size="sm"
        data-testid="share-button"
        onClick={handleClick}
        loading={loading}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="share" size={14} />
          {shareUrl ? "Copy link" : "Share"}
        </span>
      </Button>
    </div>
  );
}
