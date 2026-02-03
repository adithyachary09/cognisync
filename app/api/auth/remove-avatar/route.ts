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

    const possiblePaths = [
      `${user.id}/avatar.png`,
      `${user.id}/avatar.jpg`,
      `${user.id}/avatar.jpeg`,
      `${user.id}/avatar.webp`,
      `${user.id}/avatar.gif`,
    ];

    try {
      await admin.storage.from("avatars").remove(possiblePaths);
    } catch (e) {}

    const { error: dbError } = await admin
      .from("users")
      .update({
        avatar_url: "/placeholder-user.png",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (dbError) {
      throw new Error("Failed to remove avatar");
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