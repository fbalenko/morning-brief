import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { headline, source, analysis } = await request.json();

    if (!headline) {
      return NextResponse.json({ error: "Missing headline" }, { status: 400 });
    }

    const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-20250514",
        max_tokens: 1500,
        system: `You are a fact-checker. Verify the following financial news claim by searching the web. Check if:
1. The event/news actually happened
2. The details (numbers, dates, entities) are accurate  
3. The market impact described is reasonable

Respond ONLY in valid JSON (no markdown, no backticks, no extra text) with these exact keys:
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
      }),
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error("Anthropic verify error:", JSON.stringify(data, null, 2));
      return NextResponse.json(
        { accuracy: "ERROR", details: data?.error?.message || "Verification API failed", correctedInfo: null, sources: [] },
        { status: 500 }
      );
    }

    const text = (data.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    let parsed;
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = { accuracy: "UNCONFIRMED", details: "Could not parse verification results.", correctedInfo: null, sources: [] };
        }
      } else {
        parsed = { accuracy: "UNCONFIRMED", details: "Verification could not be completed.", correctedInfo: null, sources: [] };
      }
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Verify route error:", err);
    return NextResponse.json(
      { accuracy: "ERROR", details: err.message || "Verification failed", correctedInfo: null, sources: [] },
      { status: 500 }
    );
  }
}
