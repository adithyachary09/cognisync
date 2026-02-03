import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST() {
  try {
    // ✅ CORRECT: Use createServerClient for proper cookie handling
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Service role admin client
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // ✅ Delete all possible avatar files
    const possiblePaths = [
      `${user.id}/avatar.png`,
      `${user.id}/avatar.jpg`,
      `${user.id}/avatar.jpeg`,
      `${user.id}/avatar.webp`,
      `${user.id}/avatar.gif`,
    ];

    try {
      await admin.storage.from("avatars").remove(possiblePaths);
    } catch (e) {
      // Ignore if no files exist
    }

    // ✅ Set avatar to placeholder
    const { error: dbError } = await admin
      .from("users")
      .update({
        avatar_url: "/placeholder-user.png",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to remove avatar: " + dbError.message);
    }

    return NextResponse.json({
      success: true,
      avatar_url: "/placeholder-user.png",
    });
  } catch (err: any) {
    console.error("Remove avatar error:", err);
    return NextResponse.json(
      { error: err.message || "Server Error" },
      { status: 500 }
    );
  }
}