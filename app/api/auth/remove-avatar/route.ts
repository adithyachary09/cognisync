import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  try {
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

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Delete all possible avatar files for this user
    const possiblePaths = [
      `${user.id}/avatar.png`,
      `${user.id}/avatar.jpg`,
      `${user.id}/avatar.jpeg`,
      `${user.id}/avatar.webp`,
      `${user.id}/avatar.gif`,
    ];

    // Attempt deletion (ignore errors if files don't exist)
    await admin.storage.from("avatars").remove(possiblePaths);

    // CRITICAL FIX: Set avatar_url to placeholder path instead of null
    await admin
      .from("users")
      .update({ avatar_url: "/placeholder-user.png" })
      .eq("id", user.id);

    // Return the placeholder path so frontend can update immediately
    return NextResponse.json({ 
      success: true,
      avatar_url: "/placeholder-user.png" 
    });
  } catch (err) {
    console.error("Remove avatar error:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}