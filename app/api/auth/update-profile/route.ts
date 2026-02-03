import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    // ✅ User authentication check
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

    // ✅ Service role admin client for bypassing RLS
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const formData = await req.formData();
    const name = formData.get("name") as string | null;
    const avatarFile = formData.get("avatarFile") as File | null;

    let newAvatarUrl: string | null = null;

    // ✅ If user uploaded a new avatar, process it
    if (avatarFile && avatarFile.size > 0) {
      const ext = avatarFile.name.split(".").pop() || "png";
      const path = `${user.id}/avatar.${ext}`;

      // Delete old avatar files first
      const possibleOldPaths = [
        `${user.id}/avatar.png`,
        `${user.id}/avatar.jpg`,
        `${user.id}/avatar.jpeg`,
        `${user.id}/avatar.webp`,
        `${user.id}/avatar.gif`,
      ];
      await admin.storage.from("avatars").remove(possibleOldPaths);

      // Upload new avatar
      const { error: uploadError } = await admin.storage
        .from("avatars")
        .upload(path, avatarFile, {
          upsert: true,
          contentType: avatarFile.type,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Failed to upload avatar");
      }

      // Get public URL with cache-busting timestamp
      const { data } = admin.storage.from("avatars").getPublicUrl(path);
      newAvatarUrl = `${data.publicUrl}?t=${Date.now()}`;
    }

    // ✅ Fetch current user data to preserve existing avatar if not updating
    const { data: existingUser } = await admin
      .from("users")
      .select("avatar_url")
      .eq("id", user.id)
      .single();

    // Determine final avatar URL: new upload > existing > placeholder
    const finalAvatarUrl = newAvatarUrl || existingUser?.avatar_url || "/placeholder-user.png";

    // ✅ Upsert user data
    const { error: dbError } = await admin.from("users").upsert({
      id: user.id,
      email: user.email,
      name: name || "User",
      avatar_url: finalAvatarUrl,
      updated_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to update profile");
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