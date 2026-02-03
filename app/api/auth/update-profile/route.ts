import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: Request) {
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

    const formData = await req.formData();
    const name = formData.get("name") as string | null;
    const avatarFile = formData.get("avatarFile") as File | null;

    let newAvatarUrl: string | null = null;

    // ✅ Process avatar upload
    if (avatarFile && avatarFile.size > 0) {
      const ext = avatarFile.name.split(".").pop() || "png";
      const path = `${user.id}/avatar.${ext}`;

      // Delete old avatars
      const possibleOldPaths = [
        `${user.id}/avatar.png`,
        `${user.id}/avatar.jpg`,
        `${user.id}/avatar.jpeg`,
        `${user.id}/avatar.webp`,
        `${user.id}/avatar.gif`,
      ];
      
      try {
        await admin.storage.from("avatars").remove(possibleOldPaths);
      } catch (e) {
        // Ignore if no old files exist
      }

      // Upload new avatar
      const { error: uploadError } = await admin.storage
        .from("avatars")
        .upload(path, avatarFile, {
          upsert: true,
          contentType: avatarFile.type,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Failed to upload avatar: " + uploadError.message);
      }

      // Get public URL with cache-busting
      const { data } = admin.storage.from("avatars").getPublicUrl(path);
      newAvatarUrl = `${data.publicUrl}?t=${Date.now()}`;
    }

    // ✅ Get existing avatar if not uploading new one
    const { data: existingUser } = await admin
      .from("users")
      .select("avatar_url")
      .eq("id", user.id)
      .single();

    const finalAvatarUrl = newAvatarUrl || existingUser?.avatar_url || "/placeholder-user.png";

    // ✅ Update database
    const { error: dbError } = await admin.from("users").upsert(
      {
        id: user.id,
        email: user.email,
        name: name || "User",
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      }
    );

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to update profile: " + dbError.message);
    }

    return NextResponse.json({
      success: true,
      avatar_url: finalAvatarUrl,
      name: name || "User",
    });
  } catch (err: any) {
    console.error("Update profile error:", err);
    return NextResponse.json(
      { error: err.message || "Server Error" },
      { status: 500 }
    );
  }
}