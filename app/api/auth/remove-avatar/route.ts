import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
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

    // ✅ Service role admin client
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // ✅ Delete all possible avatar files for this user
    const possiblePaths = [
      `${user.id}/avatar.png`,
      `${user.id}/avatar.jpg`,
      `${user.id}/avatar.jpeg`,
      `${user.id}/avatar.webp`,
      `${user.id}/avatar.gif`,
    ];

    // Attempt deletion (ignore errors if files don't exist)
    await admin.storage.from("avatars").remove(possiblePaths);

    // ✅ CRITICAL FIX: Set avatar_url to placeholder path instead of null
    const { error: dbError } = await admin
      .from("users")
      .update({ 
        avatar_url: "/placeholder-user.png",
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to remove avatar");
    }

    // ✅ Return the placeholder path so frontend can update immediately
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