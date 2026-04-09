import { NextRequest, NextResponse } from 'next/server';

/** Max serverless duration where supported (vision calls can be slow) */
export const maxDuration = 60;

const FALLBACK = {
  item_name: 'Unknown Item',
  category: 'dry',
  subcategory: 'Dry Waste',
  confidence: 0,
  recyclable: false,
  disposal_steps: ['Dispose in dry bin'],
  fun_fact: 'Keep trying!',
  hindi_instruction: 'इसे सूखे कूड़ेदान में डालें',
  points_earned: 10,
  co2_saved_kg: 0.05,
  communityHint: null, // populated from feedback_stats in v2
};

const PROMPT = `You are a waste classification expert. Analyze the image and return ONLY a valid JSON object matching this exact shape: {"item_name":"string","category":"dry|wet|hazardous|ewaste","subcategory":"string","confidence":number,"recyclable":boolean,"disposal_steps":["step1","step2","step3"],"fun_fact":"string","hindi_instruction":"string","points_earned":number,"co2_saved_kg":number}`;

export async function POST(request: NextRequest) {
  try {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) {
      console.error('GEMINI_API_KEY is not set');
      return NextResponse.json(FALLBACK);
    }

    const body = await request.json();
    const { image, mimeType } = body;

    if (!image || !mimeType) return NextResponse.json(FALLBACK);

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: PROMPT },
            { inlineData: { mimeType: mimeType, data: base64Data } }
          ]
        }],
        generationConfig: { 
          responseMimeType: "application/json",
          temperature: 0.4
        }
      })
    });

    if (!geminiResponse.ok) {
      console.error("GEMINI API ERROR:", await geminiResponse.text());
      return NextResponse.json(FALLBACK);
    }

    const data = await geminiResponse.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

    if (!text) return NextResponse.json(FALLBACK);

    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    }

    try {
      const result = JSON.parse(text) as Record<string, unknown>;
      return NextResponse.json({ ...FALLBACK, ...result });
    } catch {
      console.error('GEMINI JSON parse failed, raw:', text.slice(0, 200));
      return NextResponse.json(FALLBACK);
    }

  } catch (error) {
    console.error("FATAL ROUTE ERROR:", error);
    return NextResponse.json(FALLBACK);
  }
}