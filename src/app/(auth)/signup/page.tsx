"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

function passwordStrength(pw: string): number {
  if (pw.length === 0) return 0;
  if (pw.length < 8) return 1;
  let score = 2;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score += 1;
  return Math.min(score, 4);
}

function strengthColor(score: number): string {
  if (score >= 4) return "var(--pos)";
  if (score >= 3) return "#F59E0B";
  if (score >= 2) return "var(--warn)";
  if (score >= 1) return "var(--neg)";
  return "var(--bd)";
}

function strengthLabel(score: number): string {
  if (score >= 4) return "Strong";
  if (score >= 3) return "Good";
  if (score >= 2) return "Fair";
  if (score >= 1) return "Too short";
  return "";
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Name is required";
    if (!email || !EMAIL_REGEX.test(email))
      next.email = "Enter a valid email address";
    if (password.length < 8)
      next.password = "Password must be at least 8 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name.trim() },
        },
      });

      if (error) {
        const message = error.message?.toLowerCase() ?? "";
        if (
          error.code === "user_already_exists" ||
          message.includes("already registered") ||
          message.includes("already exists")
        ) {
          setErrors({ email: "Account already exists — try logging in" });
        } else {
          toast.error(error.message);
        }
        return;
      }

      // When email confirmation is enabled, Supabase returns a "fake" user with
      // an empty identities array if the email is already registered (prevents
      // user enumeration). Treat that as the same error state.
      if (
        data.user &&
        (!data.user.identities || data.user.identities.length === 0)
      ) {
        setErrors({ email: "Account already exists — try logging in" });
        return;
      }

      router.push("/onboarding");
    } catch (err) {
      console.error("[signup] unexpected error:", err);
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
        Create your account
      </h1>
      <p style={{ fontSize: 14, color: "var(--tx2)", marginBottom: 24 }}>
        Start analyzing reviews in minutes.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <Field
          id="name"
          icon="usr"
          type="text"
          autoComplete="name"
          label="Full name"
          placeholder="Jane Doe"
          value={name}
          onChange={setName}
          error={errors.name}
        />
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
          autoComplete="new-password"
          label="Password"
          placeholder="At least 8 characters"
          value={password}
          onChange={setPassword}
          error={errors.password}
          trailing={
            password.length > 0 ? (
              <StrengthBar score={strength} />
            ) : undefined
          }
        />

        <Button
          type="submit"
          variant="coral"
          fullWidth
          loading={loading}
          style={{ marginTop: 8 }}
        >
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p
        style={{
          marginTop: 20,
          fontSize: 14,
          color: "var(--tx2)",
          textAlign: "center",
        }}
      >
        Already have an account?{" "}
        <Link
          href="/login"
          style={{
            color: "var(--teal)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Log in
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
  trailing?: React.ReactNode;
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
  trailing,
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
      {trailing}
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

function StrengthBar({ score }: { score: number }) {
  const color = strengthColor(score);
  const label = strengthLabel(score);
  return (
    <div style={{ marginTop: 8 }}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={score}
        aria-label={`Password strength: ${label}`}
        style={{ display: "flex", gap: 4 }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i <= score ? color : "var(--bd)",
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>
      {label && (
        <p style={{ marginTop: 6, fontSize: 12, color }}>{label}</p>
      )}
    </div>
  );
}
