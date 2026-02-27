import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

const SIGNAL_COLORS = {
  BULLISH: "#2d8a4e",
  BEARISH: "#c0392b",
  NEUTRAL: "#c49a2a",
  VOLATILE: "#7b5ea7",
};
const SIGNAL_LABELS = {
  BULLISH: "Bullish",
  BEARISH: "Bearish",
  NEUTRAL: "Neutral",
  VOLATILE: "Volatile",
};

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Step 1: Scan markets
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
        system: `You are a senior financial analyst. Deliver a comprehensive morning market intelligence briefing. Search for TODAY's most important news from Yahoo Finance, Bloomberg, Reuters, CNBC, FT, WSJ, MarketWatch, and credible blogs. Cover: Fed policy, tech/AI, energy, banking, healthcare, crypto, geopolitics, real estate, and general business news.

For each item provide thorough 3-5 sentence analysis, actionable insights with specific tickers, confidence score (0-100), and source URLs.

Respond ONLY with a valid JSON array (no markdown, no backticks). Each object: { "headline", "source", "sourceUrl", "sector", "signal" (BULLISH|BEARISH|NEUTRAL|VOLATILE), "impact" (HIGH|MEDIUM|LOW), "timeHorizon" (SHORT|MEDIUM|LONG), "confidence" (number), "tickers" (array), "tickerPrices" (object), "analysis", "actionable", "keyTakeaway" }. Return 10-14 items.`,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [
          {
            role: "user",
            content:
              "Search for today's most important financial news. Cover all sectors. Return JSON.",
          },
        ],
      }),
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return NextResponse.json({ error: data?.error?.message || "Anthropic API failed" }, { status: 500 });
    }

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    let items;
    try {
      items = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      const m = text.match(/\[[\s\S]*\]/);
      items = m ? JSON.parse(m[0]) : null;
    }

    if (!items?.length) {
      return NextResponse.json({ error: "No items from scan" }, { status: 500 });
    }

    // Step 2: Build email
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const bull = items.filter((n) => n.signal === "BULLISH").length;
    const bear = items.filter((n) => n.signal === "BEARISH").length;
    const high = items.filter((n) => n.impact === "HIGH");

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#faf8f4;">
<div style="font-family:Georgia,'Times New Roman',serif;max-width:680px;margin:0 auto;background:#faf8f4;color:#2c2c2c;">
<div style="padding:40px 36px 24px;border-bottom:2px solid #1a1a1a;">
  <h1 style="margin:0;font-size:32px;font-weight:400;color:#1a1a1a;">The Morning Brief</h1>
  <p style="margin:8px 0 0;font-size:14px;color:#8b8275;">${dateStr} &middot; ${timeStr} &middot; Automated Daily Scan</p>
</div>
<div style="padding:24px 36px;background:#f4f1eb;border-bottom:1px solid #e0dbd2;">
  <table width="100%"><tr>
    <td align="center" style="padding:12px;"><div style="font-size:28px;font-weight:700;color:#2d8a4e;">${bull}</div><div style="font-size:11px;color:#8b8275;text-transform:uppercase;letter-spacing:2px;">Bullish</div></td>
    <td align="center" style="padding:12px;"><div style="font-size:28px;font-weight:700;color:#c0392b;">${bear}</div><div style="font-size:11px;color:#8b8275;text-transform:uppercase;letter-spacing:2px;">Bearish</div></td>
    <td align="center" style="padding:12px;"><div style="font-size:28px;font-weight:700;color:#c49a2a;">${high.length}</div><div style="font-size:11px;color:#8b8275;text-transform:uppercase;letter-spacing:2px;">High Impact</div></td>
    <td align="center" style="padding:12px;"><div style="font-size:28px;font-weight:700;color:#1a1a1a;">${items.length}</div><div style="font-size:11px;color:#8b8275;text-transform:uppercase;letter-spacing:2px;">Total</div></td>
  </tr></table>
</div>`;

    if (high.length > 0) {
      html += `<div style="padding:28px 36px;border-bottom:1px solid #e0dbd2;">
        <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:3px;color:#c0392b;margin:0 0 20px;font-weight:600;">&#x1F6A8; Priority Alerts</h2>`;
      high.forEach((item) => {
        const sc = SIGNAL_COLORS[item.signal] || "#c49a2a";
        const sl = SIGNAL_LABELS[item.signal] || "Neutral";
        html += `<div style="padding:20px;margin-bottom:16px;background:white;border-radius:8px;border-left:4px solid ${sc};">
          <div style="font-size:18px;font-weight:600;color:#1a1a1a;margin-bottom:8px;">${item.headline}</div>
          <div style="font-size:12px;color:${sc};font-weight:700;margin-bottom:12px;">${sl} &middot; ${item.sector} &middot; ${item.confidence || 75}% confidence</div>
          ${item.keyTakeaway ? `<div style="font-size:14px;color:#1a1a1a;font-style:italic;margin-bottom:10px;padding-left:12px;border-left:2px solid #e0dbd2;">${item.keyTakeaway}</div>` : ""}
          <div style="font-size:14px;color:#4a4a4a;line-height:1.7;margin-bottom:12px;">${item.analysis}</div>
          <div style="font-size:14px;color:#2d8a4e;padding:12px;background:#e8f5ec;border-radius:6px;">&#x1F4A1; ${item.actionable}</div>
          ${item.tickers?.length ? `<div style="font-size:13px;color:#3a6ea5;margin-top:8px;">${item.tickers.map((t) => `<strong>${t}</strong>${item.tickerPrices?.[t] ? ` (${item.tickerPrices[t]})` : ""}`).join(" &middot; ")}</div>` : ""}
          ${item.sourceUrl ? `<div style="margin-top:8px;"><a href="${item.sourceUrl}" style="font-size:12px;color:#8b8275;">${item.source} &rarr;</a></div>` : ""}
        </div>`;
      });
      html += `</div>`;
    }

    html += `<div style="padding:28px 36px;">
      <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:3px;color:#8b8275;margin:0 0 20px;font-weight:600;">Complete Briefing</h2>`;
    items.forEach((item, i) => {
      const sc = SIGNAL_COLORS[item.signal] || "#c49a2a";
      const sl = SIGNAL_LABELS[item.signal] || "Neutral";
      html += `<div style="padding:20px;margin-bottom:14px;background:white;border-radius:8px;border-left:4px solid ${sc};">
        <div style="font-size:17px;font-weight:600;color:#1a1a1a;margin-bottom:6px;">${i + 1}. ${item.headline}</div>
        <div style="font-size:11px;margin-bottom:10px;color:#8b8275;"><span style="color:${sc};font-weight:700;">${sl}</span> &middot; ${item.sector} &middot; ${item.impact} &middot; ${item.timeHorizon} &middot; ${item.confidence || 75}%</div>
        ${item.keyTakeaway ? `<div style="font-size:14px;color:#1a1a1a;font-style:italic;margin-bottom:10px;padding-left:12px;border-left:2px solid #e0dbd2;">${item.keyTakeaway}</div>` : ""}
        <div style="font-size:14px;color:#4a4a4a;line-height:1.7;margin-bottom:12px;">${item.analysis}</div>
        <div style="font-size:14px;color:#2d6b3f;padding:12px;background:#f0f7f2;border-radius:6px;">&#x1F4A1; ${item.actionable}</div>
        ${item.tickers?.length ? `<div style="font-size:12px;color:#3a6ea5;margin-top:8px;">${item.tickers.map((t) => `<strong>${t}</strong>${item.tickerPrices?.[t] ? ` ${item.tickerPrices[t]}` : ""}`).join(" &middot; ")}</div>` : ""}
        ${item.sourceUrl ? `<div style="margin-top:6px;"><a href="${item.sourceUrl}" style="font-size:12px;color:#8b8275;">${item.source} &rarr;</a></div>` : ""}
      </div>`;
    });
    html += `</div>
      <div style="padding:24px 36px;text-align:center;border-top:1px solid #e0dbd2;">
        <p style="font-size:11px;color:#b0a899;">AI-generated &middot; Not financial advice &middot; Always DYOR</p>
      </div></div></body></html>`;

    // Step 3: Send email
    const { error: emailError } = await resend.emails.send({
      from: process.env.SENDER_EMAIL || "The Morning Brief <onboarding@resend.dev>",
      to: [process.env.RECIPIENT_EMAIL],
      subject: `📊 The Morning Brief — ${dateStr}`,
      html,
    });

    if (emailError) {
      return NextResponse.json({ error: emailError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, itemCount: items.length, sentTo: process.env.RECIPIENT_EMAIL });
  } catch (err) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
