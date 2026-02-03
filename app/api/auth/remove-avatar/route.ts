// @ts-nocheck
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST() {
  try {
    // ❌ was: await cookies()
    const supabaseAuth = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { cookies }
);


    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ---------------- ADMIN ---------------- */
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    /* ---------------- DELETE STORAGE ---------------- */
    const exts = ["png", "jpg", "jpeg", "gif", "webp"];
    await supabaseAdmin.storage
      .from("avatars")
      .remove(exts.map((e) => `${user.id}/avatar.${e}`));

    /* ---------------- CLEAR DB ---------------- */
    await supabaseAdmin
      .from("users")
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
