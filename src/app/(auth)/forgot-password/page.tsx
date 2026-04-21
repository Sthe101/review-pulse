"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmailError(null);

    if (!email || !EMAIL_REGEX.test(email)) {
      setEmailError("Enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        toast.error("Something went wrong. Please try again.");
        return;
      }

      setSent(true);
    } catch (err) {
      console.error("[forgot-password] unexpected error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card padding={32}>
        <div style={{ textAlign: "center" }}>
          <div
            aria-hidden="true"
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "color-mix(in srgb, var(--pos) 15%, transparent)",
              color: "var(--pos)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Icon name="ok" size={28} />
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--tx)",
              marginBottom: 8,
            }}
          >
            Check your email
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--tx2)",
              marginBottom: 24,
              lineHeight: 1.5,
            }}
          >
            If an account exists for <strong>{email}</strong>, we just sent a
            password reset link. It may take a minute to arrive.
          </p>
          <Link href="/login" style={{ textDecoration: "none" }}>
            <Button variant="coral" fullWidth>
              Back to login
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card padding={32}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: "var(--tx)",
          marginBottom: 6,
        }}
      >
        Reset your password
      </h1>
      <p style={{ fontSize: 14, color: "var(--tx2)", marginBottom: 24 }}>
        Enter the email you signed up with and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <Field
          id="email"
          icon="mail"
          type="email"
          autoComplete="email"
          label="Email"
          placeholder="you@company.com"
          value={email}
          onChange={setEmail}
          error={emailError ?? undefined}
        />

        <Button
          type="submit"
          variant="coral"
          fullWidth
          loading={loading}
          style={{ marginTop: 4 }}
        >
          {loading ? "Sending…" : "Send Reset Link"}
        </Button>
      </form>

      <p style={{ marginTop: 20, fontSize: 14, textAlign: "center" }}>
        <Link
          href="/login"
          style={{
            color: "var(--teal)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          ← Back to login
        </Link>
      </p>
    </Card>
  );
}

type FieldProps = {
  id: string;
  icon: IconName;
  type: "text" | "email" | "password";
  autoComplete: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
};

function Field({
  id,
  icon,
  type,
  autoComplete,
  label,
  placeholder,
  value,
  onChange,
  error,
}: FieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        htmlFor={id}
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--tx2)",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--tx3)",
            pointerEvents: "none",
            display: "inline-flex",
          }}
        >
          <Icon name={icon} size={18} />
        </span>
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          style={{
            paddingLeft: 38,
            borderColor: error ? "var(--neg)" : undefined,
          }}
        />
      </div>
      {error && (
        <p
          id={errorId}
          role="alert"
          style={{ marginTop: 6, fontSize: 12, color: "var(--neg)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
