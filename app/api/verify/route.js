import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const { headline, source, analysis } = await request.json();

    if (!headline) {
      return NextResponse.json(
        { error: "Missing headline" },
        { status: 400 }
      );
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: `You are a fact-checker. Verify the following financial news claim by searching the web. Check if:
1. The event/news actually happened
2. The details (numbers, dates, entities) are accurate  
3. The market impact described is reasonable

Respond ONLY in valid JSON (no markdown, no backticks) with these exact keys:
{
  "verified": boolean,
  "accuracy": "CONFIRMED" | "PARTIALLY_CONFIRMED" | "UNCONFIRMED" | "INCORRECT",
  "details": "2-3 sentence explanation of what you found",
  "correctedInfo": "any corrections needed, or null",
  "sources": ["url1", "url2"]
}`,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [
        {
          role: "user",
          content: `Verify this news: "${headline}". Source claimed: ${source || "Unknown"}. Key claims: ${analysis || "N/A"}. Search the web to cross-check this claim.`,
        },
      ],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        parsed = {
          accuracy: "UNCONFIRMED",
          details: "Verification could not be completed.",
          correctedInfo: null,
          sources: [],
        };
      }
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Verify error:", err);
    return NextResponse.json(
      {
        accuracy: "ERROR",
        details: err.message || "Verification failed",
        correctedInfo: null,
        sources: [],
      },
      { status: 500 }
    );
  }
}
