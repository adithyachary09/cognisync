import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    /* ✅ plain client (NO SSR) */
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ✅ service role admin */
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const formData = await req.formData();
    const name = formData.get("name") as string | null;
    const avatarFile = formData.get("avatarFile") as File | null;

    let avatarUrl: string | null = null;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() || "png";
      const path = `${user.id}/avatar.${ext}`;

      await admin.storage.from("avatars").upload(path, avatarFile, {
        upsert: true,
      });

      const { data } = admin.storage.from("avatars").getPublicUrl(path);
      avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
    }

    await admin.from("users").upsert({
      id: user.id,
      email: user.email,
      name,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      avatar_url: avatarUrl,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
