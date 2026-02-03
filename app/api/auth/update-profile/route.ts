import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    // ✅ Get auth token from request header
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized - No token" }, { status: 401 });
    }

    // ✅ Create client with user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized - Invalid token" }, { status: 401 });
    }

    // ✅ Service role admin
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const formData = await req.formData();
    const name = formData.get("name") as string | null;
    const avatarFile = formData.get("avatarFile") as File | null;

    let newAvatarUrl: string | null = null;

    if (avatarFile && avatarFile.size > 0) {
      const ext = avatarFile.name.split(".").pop() || "png";
      const path = `${user.id}/avatar.${ext}`;

      const possibleOldPaths = [
        `${user.id}/avatar.png`,
        `${user.id}/avatar.jpg`,
        `${user.id}/avatar.jpeg`,
        `${user.id}/avatar.webp`,
        `${user.id}/avatar.gif`,
      ];
      
      try {
        await admin.storage.from("avatars").remove(possibleOldPaths);
      } catch (e) {}

      const { error: uploadError } = await admin.storage
        .from("avatars")
        .upload(path, avatarFile, {
          upsert: true,
          contentType: avatarFile.type,
        });

      if (uploadError) {
        throw new Error("Failed to upload avatar");
      }

      const { data } = admin.storage.from("avatars").getPublicUrl(path);
      newAvatarUrl = `${data.publicUrl}?t=${Date.now()}`;
    }

    const { data: existingUser } = await admin
      .from("users")
      .select("avatar_url")
      .eq("id", user.id)
      .single();

    const finalAvatarUrl = newAvatarUrl || existingUser?.avatar_url || "/placeholder-user.png";

    const { error: dbError } = await admin.from("users").upsert(
      {
        id: user.id,
        email: user.email,
        name: name || "User",
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (dbError) {
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