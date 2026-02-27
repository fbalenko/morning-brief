# The Morning Brief — AI Market Intelligence

AI-powered daily financial briefing with real-time news scanning, expert analysis, confidence scoring, fact-checking, and email delivery.

![Stack](https://img.shields.io/badge/Next.js-14-black) ![AI](https://img.shields.io/badge/Claude-Sonnet_4-orange) ![Email](https://img.shields.io/badge/Resend-Email-blue)

---

## What It Does

- **Scans** live financial news from Yahoo Finance, Bloomberg, Reuters, CNBC, FT, and more
- **Analyzes** each story with AI: market signal, impact level, affected tickers, price data
- **Scores** confidence (0–100%) based on source quality and corroboration
- **Verifies** any claim with a one-click fact-checker that cross-references sources
- **Emails** you a beautifully formatted HTML report on demand
- **Filters** by sector: macro, tech, energy, banking, healthcare, crypto, geopolitics, real estate

---

## Deploy in 15 Minutes

### Prerequisites

- A GitHub account
- A [Vercel](https://vercel.com) account (free tier works)
- An [Anthropic API key](https://console.anthropic.com/settings/keys)
- A [Resend API key](https://resend.com/api-keys) (free tier: 100 emails/day)

### Step 1 — Get Your API Keys

**Anthropic (for AI analysis):**
1. Go to https://console.anthropic.com
2. Sign up or log in
3. Go to Settings → API Keys → Create Key
4. Copy the key (starts with `sk-ant-`)
5. Add credits — ~$5 is enough for hundreds of scans

**Resend (for email delivery):**
1. Go to https://resend.com
2. Sign up (free)
3. Go to API Keys → Create API Key
4. Copy the key (starts with `re_`)
5. Note: free tier sends from `onboarding@resend.dev` — works fine for personal use

### Step 2 — Push to GitHub

```bash
# Clone or download this project, then:
cd morning-brief
git init
git add .
git commit -m "Initial commit"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/morning-brief.git
git branch -M main
git push -u origin main
```

### Step 3 — Deploy on Vercel

1. Go to https://vercel.com/new
2. Click **Import Git Repository**
3. Select your `morning-brief` repo
4. Under **Environment Variables**, add these three:

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-your-key-here` |
| `RESEND_API_KEY` | `re_your-key-here` |
| `RECIPIENT_EMAIL` | `you@gmail.com` |

5. Click **Deploy**
6. Wait ~60 seconds. Done. Your app is live at `morning-brief-xxxxx.vercel.app`

### Step 4 — Connect Your Domain (Optional)

1. In Vercel dashboard → your project → **Settings → Domains**
2. Type your domain (e.g., `brief.yourdomain.com`)
3. Vercel gives you DNS records to add at your domain registrar
4. Add them (usually an A record + CNAME)
5. Wait 5–30 min for DNS propagation
6. HTTPS is automatic

### Step 5 — Custom Sender Email (Optional)

To send emails from `briefing@yourdomain.com` instead of `onboarding@resend.dev`:

1. In Resend dashboard → **Domains** → Add your domain
2. Add the DNS records Resend provides (usually 3 records)
3. Wait for verification
4. Add to Vercel environment variables:
   ```
   SENDER_EMAIL=The Morning Brief <briefing@yourdomain.com>
   ```
5. Redeploy

---

## Customization

### Change sectors, sources, or analysis depth

Edit the system prompt in `app/api/scan/route.js`. The `SYSTEM_PROMPT` variable controls:
- Which sectors to cover
- Which sources to prioritize
- How deep the analysis goes
- What format the response takes

### Change the design

The entire frontend is in `app/components/Dashboard.jsx` with styles in `app/globals.css`. CSS variables in `:root` control the color palette:

```css
--sand: #faf8f4;    /* background */
--ink: #1a1a1a;     /* text */
--green: #2d8a4e;   /* bullish */
--red: #c0392b;     /* bearish */
--gold: #c49a2a;    /* neutral/warning */
--blue: #3a6ea5;    /* links/tickers */
```

### Add scheduled daily emails (automated morning briefing)

Use Vercel Cron Jobs. Create `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron",
    "schedule": "0 12 * * 1-5"
  }]
}
```

Then create `app/api/cron/route.js` that calls your scan + email APIs in sequence. The schedule `0 12 * * 1-5` = 12:00 UTC (7am EST) on weekdays.

### Switch AI model

In `app/api/scan/route.js` and `app/api/verify/route.js`, change the model string:
- `claude-sonnet-4-20250514` — fast, good quality (recommended)
- `claude-opus-4-20250514` — slower, deeper analysis
- `claude-haiku-4-5-20250929` — fastest, cheapest, slightly less thorough

---

## Cost Estimate

| Usage | Anthropic Cost | Resend Cost |
|---|---|---|
| 1 scan/day | ~$0.15–0.30/day | Free (100/day) |
| 5 scans/day | ~$0.75–1.50/day | Free |
| + Verify clicks | ~$0.02–0.05 each | — |
| **Monthly (1/day)** | **~$5–9** | **Free** |

---

## Project Structure

```
morning-brief/
├── app/
│   ├── api/
│   │   ├── scan/route.js      # AI market scanning endpoint
│   │   ├── verify/route.js    # Fact-checking endpoint
│   │   └── email/route.js     # Email delivery via Resend
│   ├── components/
│   │   └── Dashboard.jsx      # Main UI component
│   ├── globals.css             # Global styles & CSS variables
│   ├── layout.js               # Root layout with fonts
│   └── page.js                 # Entry point
├── .env.example                # Environment variable template
├── .gitignore
├── next.config.js
├── package.json
└── README.md
```

---

## Troubleshooting

**"Scan failed" error:**
- Check your `ANTHROPIC_API_KEY` is correct and has credits
- Check Vercel logs: Dashboard → Functions → Logs

**Email not arriving:**
- Check `RECIPIENT_EMAIL` is correct
- Check spam folder (especially with `@resend.dev` sender)
- Check Resend dashboard for delivery status

**Slow scans:**
- Normal — the AI does multiple web searches. 15–30 seconds is typical.
- If >60 seconds, try switching to `claude-haiku-4-5-20250929` for faster results

**Verification always says "Unconfirmed":**
- This can happen with very recent news (<1 hour old)
- The fact-checker searches independently; if the news is only on one source yet, it may not find corroboration

---

## License

MIT — use it however you want.
