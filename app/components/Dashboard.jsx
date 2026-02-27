"use client";

import { useState, useEffect, useCallback } from "react";

const SECTORS = [
  "Macro & Fed",
  "Tech & AI",
  "Energy",
  "Banking",
  "Healthcare",
  "Crypto",
  "Geopolitics",
  "Real Estate",
  "General News",
];

const SIGNAL_META = {
  BULLISH: { color: "#2d8a4e", bg: "#e8f5ec", icon: "↑", label: "Bullish" },
  BEARISH: { color: "#c0392b", bg: "#fce8e6", icon: "↓", label: "Bearish" },
  NEUTRAL: { color: "#8b7355", bg: "#f5f0e8", icon: "→", label: "Neutral" },
  VOLATILE: { color: "#7b5ea7", bg: "#f0ebf5", icon: "⚡", label: "Volatile" },
};

const VERIFY_STYLES = {
  CONFIRMED: { color: "#2d8a4e", bg: "#e8f5ec", label: "✓ Confirmed" },
  PARTIALLY_CONFIRMED: { color: "#c49a2a", bg: "#fdf6e3", label: "~ Partially Confirmed" },
  UNCONFIRMED: { color: "#8b8275", bg: "#f4f1eb", label: "? Unconfirmed" },
  INCORRECT: { color: "#c0392b", bg: "#fce8e6", label: "✗ Incorrect" },
  ERROR: { color: "#c0392b", bg: "#fce8e6", label: "⚠ Check Failed" },
};

function ConfidenceBar({ score }) {
  const pct = Math.min(Math.max(score || 70, 0), 100);
  const color = pct >= 80 ? "var(--green)" : pct >= 60 ? "var(--gold)" : "var(--red)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 60, height: 4, borderRadius: 2, background: "var(--border)" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: color, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, fontFamily: "var(--mono)" }}>{pct}%</span>
    </div>
  );
}

function SignalBadge({ signal }) {
  const s = SIGNAL_META[signal] || SIGNAL_META.NEUTRAL;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 4, fontSize: 11,
      fontWeight: 700, fontFamily: "var(--mono)",
      color: s.color, background: s.bg,
    }}>
      {s.icon} {s.label}
    </span>
  );
}

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState(null);
  const [verifying, setVerifying] = useState({});
  const [verifyResults, setVerifyResults] = useState({});
  const [emailStatus, setEmailStatus] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [query, setQuery] = useState("");
  const [lastScan, setLastScan] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const runScan = useCallback(async (extra = "") => {
    setLoading(true);
    setError(null);
    setItems([]);
    setExpanded(null);
    setVerifyResults({});
    setLoadingStage("Searching financial news sources...");

    try {
      setLoadingStage("AI scanning Yahoo Finance, Reuters, Bloomberg...");

      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: extra }),
      });

      setLoadingStage("Building intelligence report...");
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Scan failed");
      }

      setItems(data.items);
      setLastScan(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingStage("");
    }
  }, []);

  const verifyItem = useCallback(async (index, item) => {
    setVerifying((v) => ({ ...v, [index]: true }));
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: item.headline,
          source: item.source,
          analysis: item.analysis,
        }),
      });
      const data = await res.json();
      setVerifyResults((v) => ({ ...v, [index]: data }));
    } catch (err) {
      setVerifyResults((v) => ({
        ...v,
        [index]: { accuracy: "ERROR", details: err.message },
      }));
    } finally {
      setVerifying((v) => ({ ...v, [index]: false }));
    }
  }, []);

  const sendEmail = async () => {
    if (!items.length) return;
    setSendingEmail(true);
    setEmailStatus(null);

    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to send");
      }
      setEmailStatus("success");
    } catch {
      setEmailStatus("error");
    } finally {
      setSendingEmail(false);
      setTimeout(() => setEmailStatus(null), 5000);
    }
  };

  const filtered = filter === "All" ? items : items.filter((i) => i.sector === filter);
  const counts = {
    bull: items.filter((n) => n.signal === "BULLISH").length,
    bear: items.filter((n) => n.signal === "BEARISH").length,
    vol: items.filter((n) => n.signal === "VOLATILE").length,
    high: items.filter((n) => n.impact === "HIGH").length,
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #faf8f4 0%, #f4f1eb 100%)" }}>

      {/* MASTHEAD */}
      <header style={{
        padding: "36px 40px 28px", borderBottom: "2px solid var(--ink)", background: "var(--sand)",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "flex-end",
            flexWrap: "wrap", gap: 16,
          }}>
            <div>
              <h1 style={{
                margin: 0, fontSize: 36, fontWeight: 400, letterSpacing: "-1.5px",
                fontFamily: "var(--serif)", color: "var(--ink)", lineHeight: 1.1,
              }}>
                The Morning Brief
              </h1>
              <p style={{
                margin: "8px 0 0", fontSize: 13, color: "var(--muted)",
                fontFamily: "var(--mono)", letterSpacing: "0.02em",
              }}>
                {currentTime.toLocaleDateString("en-US", {
                  weekday: "long", year: "numeric", month: "long", day: "numeric",
                })}
                {lastScan && ` · Updated ${lastScan.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`}
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => runScan(query)} disabled={loading} style={{
                padding: "10px 28px", borderRadius: 6,
                background: loading ? "var(--warm)" : "var(--ink)",
                color: loading ? "var(--muted)" : "var(--sand)",
                fontSize: 13, fontWeight: 600, letterSpacing: "0.03em",
              }}>
                {loading ? "Scanning..." : "Scan Markets"}
              </button>
              <button onClick={sendEmail} disabled={sendingEmail || !items.length} style={{
                padding: "10px 28px", borderRadius: 6,
                background: !items.length ? "var(--warm)" : "white",
                color: !items.length ? "var(--border)" : "var(--ink)",
                fontSize: 13, fontWeight: 600,
                border: `1px solid ${!items.length ? "var(--border)" : "var(--ink)"}`,
                letterSpacing: "0.03em",
              }}>
                {sendingEmail ? "Sending..." : "Email Report"}
              </button>
            </div>
          </div>

          {/* SEARCH */}
          <div style={{
            marginTop: 20, display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px", background: "white", borderRadius: 8,
            border: "1px solid var(--border)",
          }}>
            <span style={{ color: "var(--muted)", fontSize: 16 }}>⌕</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runScan(query)}
              placeholder="Add a focus... NVDA earnings, oil supply, Bitcoin ETF, tariff news..."
              style={{
                flex: 1, border: "none", outline: "none", background: "transparent",
                fontSize: 14, color: "var(--ink)", fontFamily: "var(--body)",
              }}
            />
          </div>
        </div>
      </header>

      {/* EMAIL TOAST */}
      {emailStatus && (
        <div style={{
          padding: "14px 40px", fontSize: 13, fontWeight: 600, textAlign: "center",
          background: emailStatus === "success" ? "#e8f5ec" : "#fce8e6",
          color: emailStatus === "success" ? "var(--green)" : "var(--red)",
          borderBottom: "1px solid var(--border)",
          animation: "fadeUp 0.3s ease",
        }}>
          {emailStatus === "success" ? "Report sent to your inbox ✓" : "Couldn't send — check email configuration"}
        </div>
      )}

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px 60px" }}>

        {/* LOADING */}
        {loading && (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div style={{
              display: "inline-block", padding: "32px 48px", background: "white",
              borderRadius: 12, border: "1px solid var(--border)",
              boxShadow: "0 2px 20px rgba(0,0,0,0.04)",
            }}>
              <div style={{
                width: 32, height: 32, border: "2px solid var(--border)",
                borderTopColor: "var(--ink)", borderRadius: "50%",
                animation: "spin 0.8s linear infinite", margin: "0 auto 20px",
              }} />
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)", marginBottom: 6 }}>
                {loadingStage}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                This typically takes 15–30 seconds
              </div>
            </div>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div style={{
            margin: "28px 0", padding: 24, borderRadius: 10,
            background: "#fce8e6", border: "1px solid #f0c6c0",
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--red)", marginBottom: 6 }}>Scan failed</div>
            <div style={{ fontSize: 13, color: "#7a3b33" }}>{error}</div>
            <button onClick={() => runScan()} style={{
              marginTop: 14, padding: "8px 20px", borderRadius: 6,
              background: "var(--red)", color: "white", fontSize: 12, fontWeight: 600,
            }}>
              Try Again
            </button>
          </div>
        )}

        {/* WELCOME */}
        {!loading && !items.length && !error && (
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 20, opacity: 0.8 }}>☀</div>
            <h2 style={{
              fontSize: 28, fontWeight: 400, color: "var(--ink)",
              fontFamily: "var(--serif)", margin: "0 0 12px", letterSpacing: "-0.5px",
            }}>
              Your daily market intelligence
            </h2>
            <p style={{
              fontSize: 15, color: "var(--muted)", maxWidth: 460, margin: "0 auto 36px",
              lineHeight: 1.7,
            }}>
              AI-powered analysis from Yahoo Finance, Bloomberg, Reuters, and more.
              Get actionable insights with confidence scores and source verification.
            </p>
            <button onClick={() => runScan()} style={{
              padding: "14px 44px", borderRadius: 8,
              background: "var(--ink)", color: "var(--sand)",
              fontSize: 15, fontWeight: 600,
              boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
            }}>
              Start Morning Scan
            </button>
          </div>
        )}

        {/* STATS */}
        {items.length > 0 && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 12, margin: "28px 0 24px",
          }}>
            {[
              { n: counts.bull, label: "Bullish", color: "var(--green)", bg: "#e8f5ec" },
              { n: counts.bear, label: "Bearish", color: "var(--red)", bg: "#fce8e6" },
              { n: counts.vol, label: "Volatile", color: "var(--purple)", bg: "#f0ebf5" },
              { n: counts.high, label: "High Impact", color: "var(--gold)", bg: "#fdf6e3" },
            ].map((s, i) => (
              <div key={i} style={{
                padding: "18px 20px", background: s.bg, borderRadius: 10,
                animation: `fadeUp 0.4s ease ${i * 80}ms both`,
              }}>
                <div style={{ fontSize: 30, fontWeight: 700, color: s.color, fontFamily: "var(--serif)", lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "var(--mono)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* FILTERS */}
        {items.length > 0 && (
          <div style={{
            display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24,
            padding: "12px 0", borderBottom: "1px solid var(--border)",
          }}>
            {["All", ...SECTORS].map((s) => (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: "6px 14px", borderRadius: 20,
                background: filter === s ? "var(--ink)" : "transparent",
                color: filter === s ? "var(--sand)" : "var(--muted)",
                fontSize: 12, fontWeight: 500,
              }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* NEWS CARDS */}
        {filtered.map((item, index) => {
          const isOpen = expanded === index;
          const sig = SIGNAL_META[item.signal] || SIGNAL_META.NEUTRAL;
          const vr = verifyResults[index];
          const isVer = verifying[index];
          const vc = vr ? VERIFY_STYLES[vr.accuracy] || VERIFY_STYLES.UNCONFIRMED : null;

          return (
            <div key={index} style={{
              marginBottom: 14, borderRadius: 10, background: "white",
              border: `1px solid ${isOpen ? sig.color + "40" : "var(--border)"}`,
              borderLeft: `4px solid ${sig.color}`,
              overflow: "hidden",
              animation: `fadeUp 0.4s ease ${index * 50}ms both`,
              boxShadow: isOpen ? "0 4px 24px rgba(0,0,0,0.06)" : "0 1px 4px rgba(0,0,0,0.02)",
              transition: "box-shadow 0.2s, border-color 0.2s",
            }}>
              {/* CARD HEADER */}
              <div onClick={() => setExpanded(isOpen ? null : index)} style={{ padding: "20px 24px", cursor: "pointer" }}>
                {item.keyTakeaway && (
                  <p style={{
                    margin: "0 0 10px", fontSize: 13, fontStyle: "italic",
                    color: "var(--muted)", fontFamily: "var(--serif)", lineHeight: 1.5,
                  }}>
                    {item.keyTakeaway}
                  </p>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                  <h3 style={{
                    margin: 0, fontSize: 17, fontWeight: 600, color: "var(--ink)",
                    fontFamily: "var(--serif)", lineHeight: 1.4, flex: 1,
                  }}>
                    {item.headline}
                  </h3>
                  <span style={{
                    fontSize: 18, color: "var(--border)", transition: "transform 0.2s",
                    transform: isOpen ? "rotate(180deg)" : "none", flexShrink: 0, marginTop: 2,
                  }}>▾</span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 12 }}>
                  <SignalBadge signal={item.signal} />
                  <span style={{
                    fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)",
                    padding: "3px 10px", background: "var(--warm)", borderRadius: 4,
                  }}>{item.sector}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, fontFamily: "var(--mono)",
                    color: item.impact === "HIGH" ? "var(--red)" : item.impact === "MEDIUM" ? "var(--gold)" : "var(--muted)",
                  }}>{item.impact}</span>
                  <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>{item.timeHorizon}</span>
                  <ConfidenceBar score={item.confidence} />
                </div>

                {item.tickers?.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                    {item.tickers.map((t, i) => {
                      const price = item.tickerPrices?.[t];
                      const isUp = price && (price.includes("+") || !price.includes("-"));
                      return (
                        <span key={i} style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "4px 10px", borderRadius: 5, fontSize: 12,
                          fontWeight: 600, fontFamily: "var(--mono)",
                          color: price ? (isUp ? "var(--green)" : "var(--red)") : "var(--blue)",
                          background: price ? (isUp ? "#e8f5ec" : "#fce8e6") : "#edf2f8",
                        }}>
                          {t}{price && <span style={{ fontWeight: 400 }}>{price}</span>}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* EXPANDED DETAIL */}
              {isOpen && (
                <div style={{ padding: "0 24px 24px", borderTop: "1px solid var(--border)", animation: "fadeUp 0.25s ease" }}>
                  <div style={{ marginTop: 20 }}>
                    <h4 style={{
                      margin: "0 0 10px", fontSize: 11, textTransform: "uppercase",
                      letterSpacing: "0.15em", color: "var(--muted)", fontFamily: "var(--mono)",
                    }}>Expert Analysis</h4>
                    <p style={{
                      margin: 0, fontSize: 14.5, color: "#3a3a3a",
                      lineHeight: 1.8, fontFamily: "var(--serif)",
                    }}>{item.analysis}</p>
                  </div>

                  <div style={{
                    marginTop: 18, padding: "16px 20px", borderRadius: 8,
                    background: "#f0f7f2", borderLeft: "3px solid var(--green)",
                  }}>
                    <h4 style={{
                      margin: "0 0 8px", fontSize: 11, textTransform: "uppercase",
                      letterSpacing: "0.15em", color: "var(--green)", fontFamily: "var(--mono)",
                    }}>💡 What To Do</h4>
                    <p style={{
                      margin: 0, fontSize: 14, color: "#2d6b3f", lineHeight: 1.7,
                    }}>{item.actionable}</p>
                  </div>

                  {item.sourceUrl && (
                    <div style={{ marginTop: 14 }}>
                      <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" style={{
                        fontSize: 13, color: "var(--blue)", fontWeight: 500,
                      }}>
                        Read full article at {item.source} →
                      </a>
                    </div>
                  )}

                  {/* VERIFY */}
                  <div style={{
                    marginTop: 18, padding: "16px 20px", borderRadius: 8,
                    background: "var(--warm)", border: "1px solid var(--border)",
                  }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", flexWrap: "wrap", gap: 10,
                    }}>
                      <h4 style={{
                        margin: 0, fontSize: 11, textTransform: "uppercase",
                        letterSpacing: "0.15em", color: "var(--muted)", fontFamily: "var(--mono)",
                      }}>Fact Check</h4>
                      {!vr && (
                        <button
                          onClick={(e) => { e.stopPropagation(); verifyItem(index, item); }}
                          disabled={isVer}
                          style={{
                            padding: "6px 18px", borderRadius: 5,
                            background: isVer ? "var(--border)" : "white",
                            color: isVer ? "var(--muted)" : "var(--ink)",
                            fontSize: 12, fontWeight: 600,
                            border: "1px solid var(--border)",
                          }}
                        >
                          {isVer ? "Verifying..." : "Verify This →"}
                        </button>
                      )}
                    </div>

                    {vr && vc && (
                      <div style={{ marginTop: 12, animation: "fadeUp 0.3s ease" }}>
                        <span style={{
                          display: "inline-block", padding: "4px 12px", borderRadius: 5,
                          fontSize: 12, fontWeight: 700, fontFamily: "var(--mono)",
                          color: vc.color, background: vc.bg,
                        }}>{vc.label}</span>
                        <p style={{
                          margin: "10px 0 0", fontSize: 13, color: "#4a4a4a", lineHeight: 1.7,
                        }}>{vr.details}</p>
                        {vr.correctedInfo && (
                          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--red)", fontWeight: 500 }}>
                            Correction: {vr.correctedInfo}
                          </p>
                        )}
                        {vr.sources?.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            {vr.sources.map((s, i) => (
                              <a key={i} href={s} target="_blank" rel="noopener noreferrer" style={{
                                display: "block", fontSize: 12, color: "var(--blue)", marginTop: 4,
                                fontFamily: "var(--mono)", overflow: "hidden",
                                textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>{s}</a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* DISCLAIMER */}
        {items.length > 0 && (
          <div style={{
            marginTop: 40, padding: "20px 0",
            borderTop: "1px solid var(--border)", textAlign: "center",
          }}>
            <p style={{
              margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.6, fontFamily: "var(--mono)",
            }}>
              AI-generated market analysis for informational purposes only. Not financial advice.<br />
              Confidence scores reflect source quality, not prediction accuracy. Always verify before trading.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
