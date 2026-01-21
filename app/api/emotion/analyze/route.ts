import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * POST /api/emotion/analyze
 * - Auth is derived from Supabase session (cookies)
 * - No userId accepted from client
 * - DB write happens ONLY here
 */
export async function POST(request: Request) {
  try {
    // 1) Parse request
    const { text } = await request.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text required" }, { status: 400 });
    }

    // 2) Create SSR-safe Supabase client (reads auth from cookies)
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            return (await cookieStore).get(name)?.value;
          },
        },
      }
    );

    // 3) Resolve authenticated user from session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 4) Emotion analysis (HF if available; safe fallback)
    let detected: string = "calm";
    let wellnessScore: number = 5;
    let guidance: string =
      "Take a moment to breathe and center yourself.";

    if (process.env.HUGGINGFACE_API_KEY) {
      try {
        const hfRes = await fetch(
          "https://router.huggingface.co/hf-inference/models/j-hartmann/emotion-english-distilroberta-base",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: text,
              options: { wait_for_model: true },
            }),
          }
        );

        const result = await hfRes.json();

        if (Array.isArray(result) && result[0]) {
          const scores = result[0] as Array<{ label: string; score: number }>;
          const top = [...scores].sort((a, b) => b.score - a.score)[0];

          const labelMap: Record<string, string> = {
            anger: "angry",
            disgust: "stressed",
            fear: "anxious",
            joy: "happy",
            neutral: "calm",
            sadness: "sad",
            surprise: "confused",
          };

          const scoreMap: Record<string, number> = {
            happy: 9,
            calm: 8,
            confused: 6,
            sad: 4,
            anxious: 3,
            stressed: 2,
            angry: 2,
          };

          detected = labelMap[top.label] ?? "calm";
          wellnessScore = scoreMap[detected] ?? 5;

          const guidanceMap: Record<string, string[]> = {
            happy: [
              "Joy is a resource—share it with someone. [Resource: Savoring]",
            ],
            sad: [
              "Try 2 minutes of movement to break inertia. [Resource: Behavioral Activation]",
            ],
            anxious: [
              "Box breathing: 4–4–4–4. [Resource: Polyvagal]",
            ],
            stressed: [
              "Progressive muscle relaxation can help. [Resource: PMR]",
            ],
            calm: [
              "Use this balance for mindful reflection. [Resource: EQ Training]",
            ],
            confused: [
              "Clarify values and next steps. [Resource: ACT]",
            ],
            angry: [
              "Breathe through the surge for 90 seconds. [Resource: Neuroanatomy]",
            ],
          };

          const variations = guidanceMap[detected] ?? [
            "Take a slow breath.",
          ];
          guidance =
            variations[Math.floor(Math.random() * variations.length)];
        }
      } catch {
        // Silent fallback
      }
    }

    // 5) Persist entry (RLS enforced via session)
    const { data: newEntry, error: insertError } = await supabase
      .from("user_entries")
      .insert({
        user_id: user.id,
        input_text: text,
        detected_emotion: detected,
        emotion_score: wellnessScore,
        source: "dashboard",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    // 6) Respond
    return NextResponse.json({
      emotion: detected,
      guidance,
      score: wellnessScore,
      newEntry,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
