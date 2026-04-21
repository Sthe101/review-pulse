"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Partial<Record<"email" | "password", string>>;

export default function LoginPage() {
  return (
    <Suspense fallback={<Card padding={32}>Loading…</Card>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!email || !EMAIL_REGEX.test(email))
      next.email = "Enter a valid email address";
    if (!password) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setFormError("Invalid email or password");
        return;
      }

      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      console.error("[login] unexpected error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
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
        Welcome back
      </h1>
      <p style={{ fontSize: 14, color: "var(--tx2)", marginBottom: 24 }}>
        Log in to your ReviewPulse account.
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
          error={errors.email}
        />
        <Field
          id="password"
          icon="lock"
          type="password"
          autoComplete="current-password"
          label="Password"
          placeholder="Your password"
          value={password}
          onChange={setPassword}
          error={errors.password}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 4,
            marginBottom: 16,
          }}
        >
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "var(--tx2)",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "var(--teal)" }}
            />
            Remember me
          </label>
          <Link
            href="/forgot-password"
            style={{
              fontSize: 13,
              color: "var(--teal)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Forgot password?
          </Link>
        </div>

        {formError && (
          <p
            role="alert"
            style={{
              marginBottom: 12,
              padding: "10px 12px",
              fontSize: 13,
              color: "var(--neg)",
              background: "color-mix(in srgb, var(--neg) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--neg) 30%, transparent)",
              borderRadius: 8,
            }}
          >
            {formError}
          </p>
        )}

        <Button
          type="submit"
          variant="coral"
          fullWidth
          loading={loading}
          style={{ marginTop: 4 }}
        >
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <OAuthButtons />

      <p
        style={{
          marginTop: 20,
          fontSize: 14,
          color: "var(--tx2)",
          textAlign: "center",
        }}
      >
        New to ReviewPulse?{" "}
        <Link
          href="/signup"
          style={{
            color: "var(--teal)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Sign up free
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
