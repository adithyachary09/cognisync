// @ts-nocheck
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // ❌ was: await cookies()
    const cookieStore = cookies();

    /* ---------------- AUTH CLIENT (reads session correctly) ---------------- */
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized — valid session required." },
        { status: 401 }
      );
    }

    /* ---------------- ADMIN CLIENT ---------------- */
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    /* ---------------- PARSE FORM ---------------- */
    const formData = await request.formData();
    const name = formData.get("name") as string | null;
    const avatarFile = formData.get("avatarFile") as File | null;

    let avatarUrl: string | null = null;

    /* ---------------- STORAGE UPLOAD ---------------- */
    if (avatarFile && avatarFile.size > 0) {
      const ext = avatarFile.name.split(".").pop() || "png";
      const path = `${user.id}/avatar.${ext}`;

            await supabaseAdmin.storage
        .from("avatars")
        .upload(path, avatarFile, {

          upsert: true,
          cacheControl: "0",
          contentType: avatarFile.type,
        });

      if (uploadError) {
        return NextResponse.json(
          { error: "Storage upload failed" },
          { status: 500 }
        );
      }

      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from("avatars").getPublicUrl(path);

      avatarUrl = `${publicUrl}?t=${Date.now()}`;
    }

    /* ---------------- DB UPDATE ---------------- */
    const payload: any = {
      id: user.id,
      email: user.email,
      updated_at: new Date().toISOString(),
    };

    if (name) payload.name = name.trim();
    if (avatarUrl) payload.avatar_url = avatarUrl;

    const { error: dbError } = await supabaseAdmin
      .from("users")
      .upsert(payload, { onConflict: "id" });

    if (dbError) {
      return NextResponse.json(
        { error: "Database update failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      avatar_url: avatarUrl,
      name: payload.name || null,
    });
  } catch (e) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
