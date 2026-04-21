"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function OAuthButtons() {
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    try {
      const supabase = createClient();
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/callback`
          : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) {
        toast.error(error.message || "Couldn't start Google sign-in.");
        setLoading(false);
      }
      // On success the browser is redirected to Google; nothing else to do.
    } catch (err) {
      console.error("[oauth] unexpected error:", err);
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <div
        role="separator"
        aria-label="or continue with"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          margin: "20px 0 16px",
        }}
      >
        <span style={{ flex: 1, height: 1, background: "var(--bd)" }} />
        <span style={{ fontSize: 12, color: "var(--tx3)", fontWeight: 500 }}>
          or continue with
        </span>
        <span style={{ flex: 1, height: 1, background: "var(--bd)" }} />
      </div>

      <Button
        type="button"
        variant="outline"
        fullWidth
        loading={loading}
        onClick={handleGoogle}
      >
        <GoogleLogo />
        <span style={{ marginLeft: 8 }}>Continue with Google</span>
      </Button>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
