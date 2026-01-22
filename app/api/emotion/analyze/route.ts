import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client
// We use a simple client here because we are handling the 'userId' manually
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/emotion/analyze
 * * CHANGES FROM ORIGINAL:
 * 1. Accepts 'userId' from the request body (fixing the Unauthorized error).
 * 2. Skips strict session validation (since you are using manual login).
 * 3. Keeps the HuggingFace AI logic intact.
 */
export async function POST(request: Request) {
  try {
    // ------------------------------------------------------------------
    // 1. Parse Request Body
    // ------------------------------------------------------------------
    const body = await request.json();
    const { text, userId } = body;

    // Validation: Ensure we have both text and a user to attach it to
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // ------------------------------------------------------------------
    // 2. Emotion Analysis (AI Model)
    // ------------------------------------------------------------------
    let detected: string = "calm";
    let wellnessScore: number = 5;
    let guidance: string = "Take a moment to breathe and center yourself.";

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

        // Process AI Response
        if (Array.isArray(result) && result[0]) {
          const scores = result[0] as Array<{ label: string; score: number }>;
          // Get the emotion with the highest confidence score
          const top = [...scores].sort((a, b) => b.score - a.score)[0];

          // Map AI labels to your App's emotion categories
          const labelMap: Record<string, string> = {
            anger: "angry",
            disgust: "stressed",
            fear: "anxious",
            joy: "happy",
            neutral: "calm",
            sadness: "sad",
            surprise: "confused",
          };

          // Assign wellness scores (1-10) based on emotion
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

          // Generate Guidance Message
          const guidanceMap: Record<string, string[]> = {
            happy: ["Joy is a resource—share it with someone. [Resource: Savoring]"],
            sad: ["Try 2 minutes of movement to break inertia. [Resource: Behavioral Activation]"],
            anxious: ["Box breathing: 4–4–4–4. [Resource: Polyvagal]"],
            stressed: ["Progressive muscle relaxation can help. [Resource: PMR]"],
            calm: ["Use this balance for mindful reflection. [Resource: EQ Training]"],
            confused: ["Clarify values and next steps. [Resource: ACT]"],
            angry: ["Breathe through the surge for 90 seconds. [Resource: Neuroanatomy]"],
          };

          const variations = guidanceMap[detected] ?? ["Take a slow breath."];
          guidance = variations[Math.floor(Math.random() * variations.length)];
        }
      } catch (aiError) {
        console.warn("AI Analysis failed, using fallback:", aiError);
        // We continue silently with default values ("calm") so the app doesn't crash
      }
    }

    // ------------------------------------------------------------------
    // 3. Save to Database
    // ------------------------------------------------------------------
    // Since RLS is disabled, we can insert directly using the userId provided
    const { data: newEntry, error: insertError } = await supabase
      .from("user_entries")
      .insert({
        user_id: userId, // <--- Using the manual ID from the frontend
        input_text: text,
        detected_emotion: detected,
        emotion_score: wellnessScore,
        source: "dashboard",
      })
      .select()
      .single();

    if (insertError) {
      console.error("DB Insert Error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // ------------------------------------------------------------------
    // 4. Return Success Response
    // ------------------------------------------------------------------
    return NextResponse.json({
      emotion: detected,
      guidance,
      score: wellnessScore,
      newEntry,
    });

  } catch (err: any) {
    console.error("Critical API Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}