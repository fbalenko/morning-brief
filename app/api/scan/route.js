import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a senior financial analyst and market strategist at a top-tier investment research firm. Your job is to deliver a comprehensive morning market intelligence briefing.

CRITICAL INSTRUCTIONS:
1. Search for TODAY's most important news using web search. Cast a wide net — do multiple searches.
2. Cover BOTH financial markets AND general world/business news that could impact investing decisions.
3. Use TRUSTED SOURCES: Yahoo Finance, Bloomberg, Reuters, CNBC, Financial Times, Wall Street Journal, MarketWatch, Barron's, The Economist, AP News, BBC Business, TechCrunch, Axios, Seeking Alpha, and credible industry blogs.
4. For each item, provide the ACTUAL SOURCE URL where you found the news.
5. Include real current stock prices or percentage moves when discussing specific tickers.

NEWS CATEGORIES TO COVER:
- Federal Reserve & central bank policy, interest rates, inflation data
- Major earnings, revenue beats/misses, forward guidance
- Geopolitical events (wars, sanctions, elections, trade deals)
- Regulatory changes (SEC, FDA, antitrust, crypto regulation)
- Sector catalysts (tech launches, drug approvals, energy supply disruptions)
- Macro indicators (jobs reports, GDP, CPI, PMI, consumer confidence)
- Crypto & digital assets (ETF flows, regulation, major moves)
- General business news that smart investors should know about
- Interesting opinion pieces or blog posts from credible financial thinkers
- Global events that could ripple into markets (weather, supply chain, politics)

ANALYSIS DEPTH — For each item write:
- 3-5 sentences of expert analysis explaining WHY this matters
- How it connects to broader market themes and other sectors
- Historical context where relevant
- Second-order effects (what most people miss about this news)
- Specific actionable intelligence: what to consider buying, selling, hedging, or watching
- Name specific ETFs or stocks when relevant

CONFIDENCE SCORING:
- Rate your confidence 0-100 in your analysis accuracy
- 90-100: Very high confidence, multiple corroborating sources
- 70-89: High confidence, solid sourcing
- 50-69: Moderate, some uncertainty in implications
- Below 50: Speculative, limited data

Respond ONLY with a valid JSON array (no markdown, no backticks, no explanation before or after). Each object must have these EXACT keys:
{"headline":"string","source":"string","sourceUrl":"string","sector":"Macro & Fed|Tech & AI|Energy|Banking|Healthcare|Crypto|Geopolitics|Real Estate|General News","signal":"BULLISH|BEARISH|NEUTRAL|VOLATILE","impact":"HIGH|MEDIUM|LOW","timeHorizon":"SHORT|MEDIUM|LONG","confidence":number,"tickers":["array"],"tickerPrices":{"SYM":"+1.2%"},"analysis":"string","actionable":"string","keyTakeaway":"string"}

Return 10-14 items. Be thorough. Use real data. No hallucinating prices or events.`;

export async function POST(request) {
  try {
    const body = await request.json();
    const query = body?.query || "";

    const userMessage = `Search for today's most important financial and general news that affects markets. Be thorough — search multiple topics: stock market today, Fed policy, tech earnings, oil prices, crypto news, geopolitics, economic data releases, and any major breaking news. ${query ? `EXTRA FOCUS: ${query}` : ""} Return the JSON array with real URLs and current data.`;

    const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-20250514",
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error("Anthropic error:", JSON.stringify(data, null, 2));
      const msg = data?.error?.message || `API returned ${apiResponse.status}`;
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const text = (data.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    if (!text.trim()) {
      return NextResponse.json(
        { error: "AI returned no text. Please try again." },
        { status: 500 }
      );
    }

    let parsed;
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          console.error("Parse failed:", text.substring(0, 500));
          return NextResponse.json(
            { error: "Could not parse AI response. Please try again." },
            { status: 500 }
          );
        }
      } else {
        console.error("No JSON array found:", text.substring(0, 500));
        return NextResponse.json(
          { error: "AI response format error. Please try again." },
          { status: 500 }
        );
      }
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json(
        { error: "No news items returned." },
        { status: 500 }
      );
    }

    return NextResponse.json({ items: parsed });
  } catch (err) {
    console.error("Scan error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
