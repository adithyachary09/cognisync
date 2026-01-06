import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

    const body = await req.json();
    const { message, history, tone, instructions } = body;

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Primary Model: gemini-2.0-flash (Smart & Fast)
    let model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Strict Tone Mapping
    let toneInstruction = "TONE: Warm, Empathetic, Gentle, and Therapist-like. Prioritize emotional support.";
    if (tone === 'rational') toneInstruction = "TONE: Strictly Logical, Analytical, Data-Driven, and Objective. Avoid emotional fluff.";
    if (tone === 'direct') toneInstruction = "TONE: Ultra-Direct, Concise, Bullet-pointed, and Action-Oriented. No filler words.";

    const systemPrompt = `
    ROLE: You are CogniSync AI, an advanced psychological state analysis assistant.
    
    [CRITICAL INSTRUCTION]: You must STRICTLY adhere to the following tone settings.
    ${toneInstruction}
    
    [USER CUSTOM INSTRUCTIONS]: 
    ${instructions ? instructions : "None provided. Use default behavior."}

    [FORMATTING RULES]:
    1. Use Markdown for structuring.
    2. **Bold** key insights or action items.
    3. Use bullet points for lists.
    4. Keep paragraphs relatively short (max 2-3 sentences) for readability.
    `;

    const chatHistory = history ? history.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.parts?.[0]?.text || msg.content || "" }] 
    })) : [];

    // Construct Chat
    const chat = model.startChat({
        history: [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "Understood. I will strictly adhere to the defined tone and persona." }] },
            ...chatHistory
        ]
    });

    try {
        const result = await chat.sendMessage(message);
        const response = result.response.text();
        return NextResponse.json({ reply: response });
    } catch (innerError: any) {
        console.warn("Primary model failed, trying fallback...", innerError.message);
        
        // 🔄 FALLBACK: Try 'gemini-flash-latest' if 2.0 fails
        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const fallbackChat = fallbackModel.startChat({ history: chatHistory }); 
        const fallbackResult = await fallbackChat.sendMessage(systemPrompt + "\n\nUser Message: " + message);
        return NextResponse.json({ reply: fallbackResult.response.text() });
    }

  } catch (error: any) {
    console.error("API ERROR:", error);
    
    // Safety Response (prevents UI crash)
    if (error.status === 429 || error.message?.includes('429')) {
       return NextResponse.json({ 
         reply: "**(High Traffic Alert)**\n\nI'm receiving a lot of requests right now. Please give me 20 seconds to cool down, then try again.",
         isFallback: true
       });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}