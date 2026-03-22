import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { foodName, category, quantity, allergyNote, note } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });

    const prompt = `
You are helping a food donation business write a clean, short listing.

Return valid JSON only with this exact shape:
{
  "foodName": "string",
  "category": "Food | Prepared Meals | Baked Goods | Groceries | Other",
  "quantity": "string",
  "allergyNote": "string",
  "note": "string"
}

Rules:
- Keep it short and practical.
- Make foodName clearer and more specific.
- Improve spelling and clarity.
- Keep quantity realistic and easy to understand.
- If allergyNote is empty, return "".
- If note is empty, return "".
- Do not include markdown.
- Do not include extra keys.

Input:
foodName: ${foodName || ""}
category: ${category || ""}
quantity: ${quantity || ""}
allergyNote: ${allergyNote || ""}
note: ${note || ""}
`;

    const response = await client.responses.create({
      model: "gpt-5.4",
      input: prompt,
    });

    const text = response.output_text?.trim();

    if (!text) {
      return NextResponse.json(
        { error: "AI returned an empty response" },
        { status: 500 }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "AI response was not valid JSON", raw: text },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("ai-listing-helper error", error);
    return NextResponse.json(
      { error: "Could not generate AI suggestion" },
      { status: 500 }
    );
  }
}
