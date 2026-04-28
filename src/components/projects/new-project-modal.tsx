"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { updateChecklistItem } from "@/lib/onboarding/update-checklist";
import type { Industry } from "@/types/database";

const INDUSTRIES: Industry[] = [
  "E-commerce",
  "SaaS",
  "Restaurant",
  "Healthcare",
  "Agency",
  "Other",
];

const SOURCES = [
  "Mixed",
  "Google",
  "Yelp",
  "Trustpilot",
  "App Store",
  "Play Store",
  "Amazon",
  "G2",
  "Capterra",
  "Other",
];

const NAME_MAX = 200;
const DESC_MAX = 1000;

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string;
};

type ProjectInsertChain = {
  insert: (v: Record<string, unknown>) => {
    select: (cols: string) => {
      single: () => Promise<{
        data: { id: string } | null;
        error: { message: string } | null;
      }>;
    };
  };
};

export function NewProjectModal({ open, onClose, userId }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState<Industry>("E-commerce");
  const [source, setSource] = useState<string>("Mixed");
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setDescription("");
    setIndustry("E-commerce");
    setSource("Mixed");
    setNameError(null);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Project name is required");
      return;
    }
    if (trimmed.length > NAME_MAX) {
      setNameError(`Name must be ${NAME_MAX} characters or fewer`);
      return;
    }
    if (description.length > DESC_MAX) {
      toast.error(`Description must be ${DESC_MAX} characters or fewer`);
      return;
    }

    setSaving(true);
    setNameError(null);

    const supabase = createClient();
    const { data, error } = await (
      supabase.from("projects") as unknown as ProjectInsertChain
    )
      .insert({
        user_id: userId,
        name: trimmed,
        description: description.trim() || null,
        industry,
        review_source: source,
        is_demo: false,
      })
      .select("id")
      .single();

    if (error || !data) {
      setSaving(false);
      toast.error(error?.message ?? "Couldn't create project. Please try again.");
      return;
    }

    void updateChecklistItem(userId, "firstProject", true).catch(() => {});

    toast.success("Project created");
    reset();
    setSaving(false);
    onClose();
    router.push(`/projects/${data.id}`);
    router.refresh();
  };

  const labelStyle = {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--tx2)",
    display: "block",
    marginBottom: 4,
  } as const;

  return (
    <Modal open={open} onClose={handleClose} title="Create New Project">
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="np-name" style={labelStyle}>
            Project name <span style={{ color: "var(--neg)" }}>*</span>
          </label>
          <input
            id="np-name"
            type="text"
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder="e.g. ShopEase Google Reviews"
            aria-invalid={nameError ? "true" : undefined}
            aria-describedby={nameError ? "np-name-err" : undefined}
            style={
              nameError ? { borderColor: "var(--neg)" } : undefined
            }
            disabled={saving}
            autoFocus
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 4,
              fontSize: 12,
              color: "var(--tx3)",
            }}
          >
            <span id="np-name-err" role="alert" style={{ color: "var(--neg)" }}>
              {nameError ?? " "}
            </span>
            <span>
              {name.length}/{NAME_MAX}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="np-desc" style={labelStyle}>
            Description
          </label>
          <textarea
            id="np-desc"
            value={description}
            maxLength={DESC_MAX}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional context — what reviews are you tracking?"
            rows={3}
            style={{ resize: "vertical", lineHeight: 1.5 }}
            disabled={saving}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <label htmlFor="np-industry" style={labelStyle}>
              Industry
            </label>
            <select
              id="np-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value as Industry)}
              disabled={saving}
            >
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="np-source" style={labelStyle}>
              Review source
            </label>
            <select
              id="np-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              disabled={saving}
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={saving}
            style={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="navy"
            loading={saving}
            style={{ flex: 1 }}
          >
            {saving ? "Creating…" : "Create Project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
