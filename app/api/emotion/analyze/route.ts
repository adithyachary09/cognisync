import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    // 1. Parse Request
    const body = await request.json();
    const { text, userId } = body;

    console.log("🔹 API /analyze called");
    console.log("🔹 Received User ID:", userId);
    console.log("🔹 Received Text length:", text?.length);

    if (!text) return NextResponse.json({ error: "Text required" }, { status: 400 });
    if (!userId) {
      console.error("❌ API Error: User ID is missing in request body.");
      return NextResponse.json({ error: "User ID is mandatory for saving data." }, { status: 400 });
    }

    // 2. Initialize Supabase (Prefer Service Role for Admin Writes)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn("⚠️ Warning: SUPABASE_SERVICE_ROLE_KEY is missing. Falling back to Anon Key. RLS might block writes.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false, // API routes shouldn't persist sessions
        autoRefreshToken: false,
      }
    });

    // 3. Analyze with Hugging Face (or Mock if API Key missing)
    let detected = "calm";
    let wellnessScore = 5;
    let randomResponse = "Take a moment to breathe and center yourself.";

    if (process.env.HUGGINGFACE_API_KEY) {
      try {
        const response = await fetch(
          "https://router.huggingface.co/hf-inference/models/j-hartmann/emotion-english-distilroberta-base",
          {
            headers: {
              Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({ 
              inputs: text,
              options: { wait_for_model: true } 
            }),
          }
        );

        const result = await response.json();

        if (Array.isArray(result) && result[0]) {
          const scores = result[0];
          // @ts-ignore
          const sorted = [...scores].sort((a, b) => b.score - a.score);
          const top = sorted[0];
          
          const lowercaseText = text.toLowerCase();
          let finalLabel = top.label;

          // --- SMART OVERRIDES ---
          if (lowercaseText.includes("lonely") || lowercaseText.includes("alone") || lowercaseText.includes("isolated")) {
            finalLabel = "lonely";
          } else if (lowercaseText.includes("sick") || lowercaseText.includes("overwhelmed")) {
            finalLabel = "disgust"; // Maps to Stressed
          }

          // --- MAPPING ---
          const labelMap: Record<string, string> = {
            anger: "angry", disgust: "stressed", fear: "anxious",
            joy: "happy", neutral: "calm", sadness: "sad", surprise: "confused",
            lonely: "lonely"
          };

          const scoreMap: Record<string, number> = {
            happy: 9, calm: 8, confused: 6, surprise: 6,
            sad: 4, lonely: 3, anxious: 3, stressed: 2, angry: 2
          };

          detected = labelMap[finalLabel] || "calm";
          wellnessScore = scoreMap[detected] || 5;

          // Guidance Map
          const guidanceMap: Record<string, string[]> = {
            happy: ["Joy is a vital resource. Share this news with a loved one. [Resource: Positive Psychology Savoring]"],
            sad: ["Low mood creates a 'lethargy trap'. Try moving for 2 minutes. [Resource: CBT Behavioral Activation]"],
            anxious: ["Use 'Box Breathing': Inhale 4s, hold 4s, exhale 4s, hold 4s. [Resource: Polyvagal Theory]"],
            stressed: ["Try 'Progressive Muscle Relaxation': squeeze shoulders for 5s, release. [Resource: PMR Guide]"],
            calm: ["Use this balance for 'Mindful Reflection'. [Resource: EQ Training]"],
            lonely: ["Try 'Micro-Connections': text a friend. [Resource: Social Connectivity]"],
            confused: ["Practice 'Values Alignment'. [Resource: ACT Therapy]"],
            angry: ["Use 'The 90-Second Rule': breathe through the surge. [Resource: Neuroanatomy of Emotion]"]
          };

          const variations = guidanceMap[detected] || ["Take a deep breath."];
          randomResponse = variations[Math.floor(Math.random() * variations.length)];
        }
      } catch (hfError) {
        console.error("HuggingFace Error:", hfError);
        // Fallback to basic keyword matching if API fails
        if (text.includes("sad")) detected = "sad";
        else if (text.includes("happy")) detected = "happy";
      }
    }

    // 4. Persist to Database (The Critical Fix)
    console.log(`📝 Saving to DB: User ${userId}, Emotion ${detected}`);
    
    const { data: newEntry, error } = await supabase
      .from('user_entries')
      .insert([{
        user_id: userId, // Ensuring this is strictly passed
        input_text: text,
        detected_emotion: detected,
        emotion_score: wellnessScore,
        // created_at is auto-generated by DB, usually
      }])
      .select()
      .single();
    
    if (error) {
      console.error("❌ DB Insert Error:", error.message);
      throw new Error(`Database Error: ${error.message}`);
    }

    console.log("✅ DB Save Success. New ID:", newEntry?.id);

    return NextResponse.json({ 
      emotion: detected,
      guidance: randomResponse,
      score: wellnessScore,
      newEntry: newEntry 
    });

  } catch (error: any) {
    console.error("🔥 Analysis API Critical Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}