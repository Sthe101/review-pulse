import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TOKEN_RE = /^[0-9a-f]{16,64}$/i;

type ShareRow = { id: string };

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    if (!TOKEN_RE.test(token)) {
      return NextResponse.json(
        { error: "Invalid share token." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const findRes = (await (
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
              maybeSingle: () => Promise<{
                data: ShareRow | null;
                error: unknown;
              }>;
            };
          };
        };
      }
    )
      .select("id")
      .eq("share_token", token)
      .eq("user_id", user.id)
      .maybeSingle()) as { data: ShareRow | null; error: unknown };

    if (!findRes.data) {
      return NextResponse.json(
        { error: "Share not found." },
        { status: 404 },
      );
    }

    const updateRes = (await (
      supabase.from("shared_reports") as unknown as {
        update: (patch: Record<string, unknown>) => {
          eq: (
            col: string,
            val: string,
          ) => Promise<{ error: { message?: string } | null }>;
        };
      }
    )
      .update({ is_active: false })
      .eq("id", findRes.data.id)) as {
      error: { message?: string } | null;
    };

    if (updateRes.error) {
      console.error(
        "[/api/share/{token}] deactivate failed:",
        updateRes.error.message,
      );
      return NextResponse.json(
        { error: "Could not deactivate share." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/share/{token}] unhandled:", err);
    return NextResponse.json(
      { error: "Unexpected error. Please try again." },
      { status: 500 },
    );
  }
}
