import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  analysis_id: z.string().uuid(),
});

type ProjectRow = { id: string; user_id: string };
type ShareRow = { id: string; share_token: string };

function appOrigin(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/+$/, "");
  return req.nextUrl.origin;
}

function shareUrl(req: NextRequest, token: string): string {
  return `${appOrigin(req)}/report/${token}`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const { analysis_id } = parsed.data;

    // Verify ownership: analysis -> project -> user_id.
    const analysisRes = (await (
      supabase.from("analyses") as unknown as {
        select: (cols: string) => {
          eq: (
            col: string,
            val: string,
          ) => {
            maybeSingle: () => Promise<{
              data: { id: string; project_id: string } | null;
              error: unknown;
            }>;
          };
        };
      }
    )
      .select("id, project_id")
      .eq("id", analysis_id)
      .maybeSingle()) as {
      data: { id: string; project_id: string } | null;
      error: unknown;
    };

    if (!analysisRes.data) {
      return NextResponse.json(
        { error: "Analysis not found." },
        { status: 404 },
      );
    }

    const projectRes = (await (
      supabase.from("projects") as unknown as {
        select: (cols: string) => {
          eq: (
            col: string,
            val: string,
          ) => {
            eq: (
              col: string,
              val: string,
            ) => {
              maybeSingle: () => Promise<{
                data: ProjectRow | null;
                error: unknown;
              }>;
            };
          };
        };
      }
    )
      .select("id, user_id")
      .eq("id", analysisRes.data.project_id)
      .eq("user_id", user.id)
      .maybeSingle()) as { data: ProjectRow | null; error: unknown };

    if (!projectRes.data) {
      return NextResponse.json(
        { error: "Analysis not found." },
        { status: 404 },
      );
    }

    // Reuse an existing active share if there is one.
    const existingRes = (await (
      supabase.from("shared_reports") as unknown as {
        select: (cols: string) => {
          eq: (
            col: string,
            val: string,
          ) => {
            eq: (
              col: string,
              val: string,
            ) => {
              eq: (
                col: string,
                val: boolean,
              ) => {
                maybeSingle: () => Promise<{
                  data: ShareRow | null;
                  error: unknown;
                }>;
              };
            };
          };
        };
      }
    )
      .select("id, share_token")
      .eq("user_id", user.id)
      .eq("analysis_id", analysis_id)
      .eq("is_active", true)
      .maybeSingle()) as { data: ShareRow | null; error: unknown };

    if (existingRes.data) {
      const token = existingRes.data.share_token;
      return NextResponse.json({ url: shareUrl(req, token), token });
    }

    const insertRes = (await (
      supabase.from("shared_reports") as unknown as {
        insert: (row: Record<string, unknown>) => {
          select: (cols: string) => {
            single: () => Promise<{
              data: ShareRow | null;
              error: { message?: string } | null;
            }>;
          };
        };
      }
    )
      .insert({
        user_id: user.id,
        analysis_id,
        is_active: true,
      })
      .select("id, share_token")
      .single()) as {
      data: ShareRow | null;
      error: { message?: string } | null;
    };

    if (!insertRes.data || insertRes.error) {
      const detail = insertRes.error?.message ?? "insert failed";
      console.error("[/api/share] insert failed:", detail);
      return NextResponse.json(
        { error: "Could not create share link." },
        { status: 500 },
      );
    }

    const token = insertRes.data.share_token;
    return NextResponse.json({ url: shareUrl(req, token), token });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected share failure.";
    console.error("[/api/share] unhandled:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
