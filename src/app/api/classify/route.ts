import { NextRequest, NextResponse } from 'next/server';
import type { ClassificationResult } from '@/types';

const FALLBACK: ClassificationResult = {
  item_name: 'Unknown Item',
  category: 'dry',
  subcategory: 'General Waste',
  confidence: 60,
  recyclable: false,
  disposal_steps: [
    'Identify the item type',
    'Separate from other waste',
    'Place in the appropriate colored bin',
  ],
  co2_saved_kg: 0.05,
  fun_fact: 'Proper waste segregation can reduce landfill waste by up to 70%.',
  hindi_instruction: 'इस वस्तु को उचित रंग के डब्बे में डालें।',
  points_earned: 10,
};

const PROMPT = `You are a waste classification expert for India's Swachh Bharat Mission.
Analyze the image carefully and classify the waste item shown.

CLASSIFICATION RULES:
- "dry": paper, cardboard, plastic bottles/bags/wrappers, metal cans, glass, rubber, cloth, leather, tetra packs
- "wet": food waste, vegetable/fruit peels, leftover cooked food, garden waste, flowers, eggshells, tea leaves
- "hazardous": batteries (any type), medicines/pills, chemicals, paint, pesticides, motor oil, syringes, tubelight/CFL bulbs, thermometers
- "ewaste": mobile phones, laptops, tablets, chargers, USB cables, earphones, circuit boards, remote controls, keyboards, mice, any electronic device

RESPONSE RULES:
- category MUST be exactly one of: "dry", "wet", "hazardous", "ewaste"
- confidence: 0-100 integer
- disposal_steps: exactly 3 steps, India-specific, mention the colored bin (blue/green/red)
- co2_saved_kg: realistic decimal (e.g. 0.03 for tissue, 0.15 for plastic bottle, 2.5 for laptop)
- fun_fact: one surprising sentence that makes the user think
- hindi_instruction: one complete sentence in Devanagari script telling what to do
- points_earned: 10 for dry/wet, 20 for hazardous, 25 for ewaste
- If the image is unclear or not waste: classify as the closest matching category, do not return errors

CRITICAL OUTPUT FORMAT:
- Output a raw JSON object and NOTHING ELSE
- Do NOT use markdown, backticks, code fences, or any formatting
- Do NOT write any text before or after the JSON
- The very first character of your response must be { and the very last must be }

Required JSON shape:
{"item_name":"string","category":"dry|wet|hazardous|ewaste","subcategory":"string","confidence":number,"recyclable":boolean,"disposal_steps":["step1","step2","step3"],"co2_saved_kg":number,"fun_fact":"string","hindi_instruction":"string","points_earned":number}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, mimeType } = body as { image?: string; mimeType?: string };

    if (!image || !mimeType) {
      return NextResponse.json(
        { error: 'Missing required fields: image and mimeType' },
        { status: 400 },
      );
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: image,
                  },
                },
                { text: PROMPT },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 600,
            responseMimeType: 'application/json',
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      return NextResponse.json(
        { error: 'Gemini API error', details: errText },
        { status: 500 },
      );
    }

    const geminiData = await geminiResponse.json();
    const text: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    let parsed: ClassificationResult;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error('classify: JSON.parse failed. Raw text:', text, err);
      parsed = FALLBACK;
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('classify route error:', err);
    return NextResponse.json(FALLBACK);
  }
}
