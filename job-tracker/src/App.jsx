import { useState, useEffect, useCallback, useMemo } from "react";

// === STORAGE KEYS ===
const STORAGE = {
  applied: "matt_jobs_applied_v2",
  hidden: "matt_jobs_hidden_v2",
  viewed: "matt_jobs_viewed_v2",      // { jobId: timestampISO }
  prefs: "matt_jobs_prefs_v2",        // { minSalary, workType, theme }
};

const DEFAULT_PREFS = {
  minSalary: 70,           // in $k
  workType: "all",         // all | hybrid | remote | onsite
  theme: "dark",           // dark | light
};

function loadStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveStorage(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// === THEME ===
const THEMES = {
  dark: {
    bg: "#0a0a0b",
    cardBg: "#111114",
    cardBgApplied: "#0d1410",
    cardBgViewed: "#0d0d10",
    border: "#1c1c20",
    borderHover: "#2a2a30",
    borderApplied: "#1f4d2e",
    text: "#f0f0f5",
    textDim: "#7a7a85",
    textMuted: "#4a4a52",
    accent: "#4ade80",
    accentSoft: "#0a2416",
    blue: "#60a5fa",
    blueBg: "#0f1a30",
    blueBorder: "#1e3a5f",
    yellow: "#fbbf24",
    red: "#f87171",
    redBg: "#1a0a0a",
    panelBg: "#0d0d10",
  },
  light: {
    bg: "#f8f9fb",
    cardBg: "#ffffff",
    cardBgApplied: "#f0fdf4",
    cardBgViewed: "#f8f8fb",
    border: "#e5e7eb",
    borderHover: "#cbd5e1",
    borderApplied: "#86efac",
    text: "#111827",
    textDim: "#6b7280",
    textMuted: "#9ca3af",
    accent: "#16a34a",
    accentSoft: "#dcfce7",
    blue: "#2563eb",
    blueBg: "#dbeafe",
    blueBorder: "#93c5fd",
    yellow: "#d97706",
    red: "#dc2626",
    redBg: "#fef2f2",
    panelBg: "#ffffff",
  },
};

const FIT_COLORS = {
  HIGH: { dark: "#4ade80", light: "#16a34a" },
  MED:  { dark: "#fbbf24", light: "#d97706" },
  LOW:  { dark: "#f87171", light: "#dc2626" },
};

// === BADGE STATUS for "Today/Updated/Viewed" ===
function getJobStatus(job, viewedMap) {
  const viewed = viewedMap[job.id];
  if (viewed) return "viewed";

  // New today: posted within last 24h
  const postedRecent = /\b(just now|hour|today|0d|1h|2h|3h|4h|5h|6h|7h|8h|9h|10h|11h|12h|13h|14h|15h|16h|17h|18h|19h|20h|21h|22h|23h)\b/i.test(job.posted || "");
  if (postedRecent) return "new";

  return "updated";
}

function StatusBadge({ status, theme }) {
  const c = THEMES[theme];
  const configs = {
    new: { label: "🟢 NEW TODAY", bg: c.accentSoft, color: c.accent, border: c.accent },
    updated: { label: "🔁 UPDATED", bg: c.blueBg, color: c.blue, border: c.blueBorder },
    viewed: { label: "👀 VIEWED", bg: "transparent", color: c.textMuted, border: c.border },
  };
  const cfg = configs[status];
  return (
    <span style={{
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      borderRadius: 4, padding: "2px 7px", fontSize: 9, fontWeight: 700,
      letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace"
    }}>
      {cfg.label}
    </span>
  );
}

function FitBadge({ fit, theme }) {
  const c = THEMES[theme];
  const color = FIT_COLORS[fit]?.[theme] || c.textMuted;
  return (
    <span style={{
      background: theme === "dark" ? `${color}15` : `${color}20`,
      color, border: `1px solid ${color}40`,
      borderRadius: 3, padding: "1px 7px", fontSize: 10, fontWeight: 700,
      letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace"
    }}>{fit}</span>
  );
}

function MatchScore({ score, theme }) {
  const c = THEMES[theme];
  // Color tier: 80+ green, 60-79 yellow, <60 red
  const color = score >= 80 ? c.accent : score >= 60 ? c.yellow : c.red;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: theme === "dark" ? `${color}10` : `${color}15`,
      border: `1px solid ${color}40`,
      borderRadius: 6, padding: "3px 9px"
    }}>
      <span style={{ color, fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{score}%</span>
      <span style={{ color: c.textDim, fontSize: 9, fontWeight: 600, letterSpacing: "0.08em" }}>MATCH</span>
    </div>
  );
}

function JobCard({ job, isApplied, isHidden, status, theme, onApply, onHide, onUnhide, onView }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const c = THEMES[theme];
  const fitColor = FIT_COLORS[job.fit]?.[theme] || c.textMuted;

  const handleApplyClick = (e) => {
    onView(job);
    // Don't prevent default — let the link open
  };

  const cardBg = isApplied ? c.cardBgApplied : (status === "viewed" ? c.cardBgViewed : c.cardBg);
  const cardBorder = isApplied ? c.borderApplied : (hover ? c.borderHover : c.border);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderLeft: `3px solid ${fitColor}`,
        borderRadius: 10, marginBottom: 12, overflow: "hidden",
        transition: "all 0.18s ease",
        transform: hover ? "translateY(-1px)" : "translateY(0)",
        boxShadow: hover ? (theme === "dark" ? "0 4px 16px rgba(0,0,0,0.4)" : "0 4px 12px rgba(0,0,0,0.06)") : "none",
      }}
    >
      <div style={{ padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Top row: badges */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 7, alignItems: "center" }}>
            <StatusBadge status={status} theme={theme} />
            <FitBadge fit={job.fit} theme={theme} />
            <span style={{ color: c.textMuted, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>{job.platform}</span>
            <span style={{ color: c.textMuted, fontSize: 10 }}>· {job.posted}</span>
            {isApplied && <span style={{ color: c.accent, fontSize: 10, fontWeight: 700 }}>✓ APPLIED</span>}
          </div>

          {/* Title */}
          <div style={{ color: c.text, fontWeight: 600, fontSize: 15, marginBottom: 3, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
            {job.title}
          </div>
          <div style={{ color: c.textDim, fontSize: 12.5, marginBottom: 8 }}>
            {job.company}{job.location ? ` · ${job.location}` : ""}
          </div>

          {/* Match + Salary row */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: job.fitReason ? 8 : 0 }}>
            {job.matchScore && <MatchScore score={job.matchScore} theme={theme} />}
            {job.salary && (
              <span style={{
                color: fitColor, fontSize: 12, fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace"
              }}>
                💰 {job.salary}
              </span>
            )}
          </div>

          {job.fitReason && (
            <div style={{ color: c.textMuted, fontSize: 11, fontStyle: "italic", lineHeight: 1.5 }}>
              {job.fitReason}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          {job.applyUrl && (
            <a href={job.applyUrl} target="_blank" rel="noreferrer" onClick={handleApplyClick}
              style={{
                background: theme === "dark" ? `${fitColor}15` : `${fitColor}20`,
                color: fitColor, border: `1px solid ${fitColor}50`,
                borderRadius: 6, padding: "6px 13px", fontSize: 11.5, fontWeight: 600,
                textDecoration: "none", textAlign: "center", whiteSpace: "nowrap",
                transition: "all 0.15s"
              }}>Apply →</a>
          )}
          {!isHidden && (
            <button onClick={() => onApply(job)} style={{
              background: isApplied ? c.accentSoft : "transparent",
              border: `1px solid ${isApplied ? c.accent : c.border}`,
              color: isApplied ? c.accent : c.textDim,
              borderRadius: 6, padding: "6px 13px", fontSize: 11.5, fontWeight: 500,
              cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s"
            }}>{isApplied ? "Applied ✓" : "Mark Applied"}</button>
          )}
          {isHidden ? (
            <button onClick={() => onUnhide(job)} style={{
              background: "transparent", border: `1px solid ${c.border}`,
              color: c.textDim, borderRadius: 6, padding: "6px 13px",
              fontSize: 11.5, cursor: "pointer", whiteSpace: "nowrap"
            }}>↶ Restore</button>
          ) : (
            <button onClick={() => setOpen(v => !v)} style={{
              background: "transparent", border: `1px solid ${c.border}`,
              color: c.textDim, borderRadius: 6, padding: "6px 13px",
              fontSize: 11.5, cursor: "pointer"
            }}>{open ? "Less" : "More"}</button>
          )}
        </div>
      </div>

      {open && !isHidden && (
        <div style={{ borderTop: `1px solid ${c.border}`, padding: "16px 18px", background: c.panelBg }}>
          {job.summary ? (
            <p style={{ color: c.text, fontSize: 13, lineHeight: 1.7, marginBottom: 14, opacity: 0.85 }}>{job.summary}</p>
          ) : (
            <div style={{ color: c.textMuted, fontSize: 12, fontStyle: "italic", marginBottom: 14 }}>
              No description available · click Apply for full posting
            </div>
          )}
          {job.keyMatch?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: c.textMuted, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 7 }}>Why You Match</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {job.keyMatch.map((m, i) => (
                  <span key={i} style={{
                    background: theme === "dark" ? "#1a1a1f" : "#f1f5f9",
                    border: `1px solid ${c.border}`, color: c.textDim,
                    borderRadius: 4, padding: "3px 9px", fontSize: 11
                  }}>{m}</span>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => onHide(job)} style={{
            background: "transparent", border: `1px solid ${c.red}40`,
            color: c.red, borderRadius: 6, padding: "6px 13px",
            fontSize: 11.5, cursor: "pointer", opacity: 0.8
          }}>Not Interested</button>
        </div>
      )}
    </div>
  );
}

function HistoryRow({ entry, onAction, color, dateLabel, theme }) {
  const c = THEMES[theme];
  const fitColor = FIT_COLORS[entry.fit]?.[theme] || c.textMuted;
  const accentColor = color === "green" ? c.accent : c.red;
  return (
    <div style={{
      background: c.cardBg, border: `1px solid ${c.border}`,
      borderLeft: `3px solid ${accentColor}`, borderRadius: 8,
      padding: "13px 15px", marginBottom: 9,
      display: "flex", alignItems: "center", gap: 12
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
          <FitBadge fit={entry.fit} theme={theme} />
          {color === "green"
            ? <span style={{ color: c.accent, fontSize: 10, fontWeight: 700 }}>✓ APPLIED</span>
            : <span style={{ color: c.red, fontSize: 10, fontWeight: 700 }}>✗ NOT INTERESTED</span>}
          {dateLabel && <span style={{ color: c.textMuted, fontSize: 10 }}>{dateLabel}</span>}
        </div>
        <div style={{ color: c.text, fontWeight: 600, fontSize: 13.5 }}>{entry.title}</div>
        <div style={{ color: c.textDim, fontSize: 11.5 }}>{entry.company}{entry.location ? ` · ${entry.location}` : ""}</div>
        {entry.salary && <div style={{ color: fitColor, fontSize: 10, marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>{entry.salary}</div>}
      </div>
      {entry.applyUrl && (
        <a href={entry.applyUrl} target="_blank" rel="noreferrer" style={{
          background: "transparent", border: `1px solid ${accentColor}40`,
          color: accentColor, borderRadius: 5, padding: "4px 11px",
          fontSize: 10.5, textDecoration: "none", whiteSpace: "nowrap"
        }}>View</a>
      )}
      <button onClick={() => onAction(entry.id)} style={{
        background: "transparent", border: `1px solid ${c.border}`,
        color: c.textMuted, borderRadius: 5, padding: "4px 9px",
        fontSize: 11, cursor: "pointer"
      }}>↶</button>
    </div>
  );
}

function SettingsPanel({ open, onClose, prefs, onSave, theme }) {
  const c = THEMES[theme];
  const [draft, setDraft] = useState(prefs);

  useEffect(() => { setDraft(prefs); }, [prefs, open]);

  if (!open) return null;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      backdropFilter: "blur(4px)"
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: c.panelBg, border: `1px solid ${c.border}`,
        borderRadius: 12, padding: 22, maxWidth: 440, width: "100%",
        boxShadow: theme === "dark" ? "0 20px 60px rgba(0,0,0,0.5)" : "0 20px 60px rgba(0,0,0,0.15)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <div style={{ color: c.text, fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>Preferences</div>
            <div style={{ color: c.textMuted, fontSize: 11.5, marginTop: 2 }}>Saved to this browser</div>
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: `1px solid ${c.border}`,
            color: c.textDim, borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer"
          }}>Close</button>
        </div>

        {/* Salary minimum */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", color: c.textDim, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
            Minimum Salary (k)
          </label>
          <input
            type="range" min="40" max="250" step="10"
            value={draft.minSalary}
            onChange={e => setDraft({ ...draft, minSalary: parseInt(e.target.value) })}
            style={{ width: "100%", accentColor: c.accent }}
          />
          <div style={{ color: c.text, fontSize: 18, fontWeight: 700, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
            ${draft.minSalary}k+
          </div>
        </div>

        {/* Work type */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", color: c.textDim, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
            Work Type
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[["all", "All"], ["onsite", "On-site"], ["hybrid", "Hybrid"], ["remote", "Remote"]].map(([val, label]) => (
              <button key={val} onClick={() => setDraft({ ...draft, workType: val })} style={{
                background: draft.workType === val ? c.accentSoft : "transparent",
                border: `1px solid ${draft.workType === val ? c.accent : c.border}`,
                color: draft.workType === val ? c.accent : c.textDim,
                borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer"
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", color: c.textDim, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
            Theme
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            {[["dark", "🌙 Dark"], ["light", "☀️ Light"]].map(([val, label]) => (
              <button key={val} onClick={() => setDraft({ ...draft, theme: val })} style={{
                background: draft.theme === val ? c.accentSoft : "transparent",
                border: `1px solid ${draft.theme === val ? c.accent : c.border}`,
                color: draft.theme === val ? c.accent : c.textDim,
                borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer"
              }}>{label}</button>
            ))}
          </div>
        </div>

        <button onClick={() => { onSave(draft); onClose(); }} style={{
          width: "100%", background: c.blueBg, border: `1px solid ${c.blueBorder}`,
          color: c.blue, borderRadius: 8, padding: "12px 0",
          fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: "0.05em"
        }}>SAVE PREFERENCES</button>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("active");
  const [jobs, setJobs] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [applied, setApplied] = useState(() => loadStorage(STORAGE.applied, {}));
  const [hidden, setHidden] = useState(() => loadStorage(STORAGE.hidden, {}));
  const [viewed, setViewed] = useState(() => loadStorage(STORAGE.viewed, {}));
  const [prefs, setPrefs] = useState(() => loadStorage(STORAGE.prefs, DEFAULT_PREFS));

  const theme = prefs.theme || "dark";
  const c = THEMES[theme];

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setJobs(data.jobs || []);
      setLastUpdated(data.lastUpdated);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const markApplied = (job) => {
    const next = { ...applied };
    if (next[job.id]) {
      delete next[job.id];
    } else {
      next[job.id] = {
        id: job.id, title: job.title, company: job.company,
        location: job.location, fit: job.fit, applyUrl: job.applyUrl,
        platform: job.platform, salary: job.salary,
        dateApplied: new Date().toLocaleDateString(),
      };
    }
    setApplied(next);
    saveStorage(STORAGE.applied, next);
  };

  const unapply = (id) => {
    const next = { ...applied }; delete next[id];
    setApplied(next); saveStorage(STORAGE.applied, next);
  };

  const hide = (job) => {
    const next = { ...hidden };
    next[job.id] = {
      id: job.id, title: job.title, company: job.company,
      location: job.location, fit: job.fit, applyUrl: job.applyUrl,
      platform: job.platform, salary: job.salary,
      dateHidden: new Date().toLocaleDateString(),
    };
    setHidden(next); saveStorage(STORAGE.hidden, next);
  };

  const unhide = (jobOrId) => {
    const id = typeof jobOrId === "string" ? jobOrId : jobOrId.id;
    const next = { ...hidden }; delete next[id];
    setHidden(next); saveStorage(STORAGE.hidden, next);
  };

  const markViewed = (job) => {
    if (viewed[job.id]) return;
    const next = { ...viewed, [job.id]: new Date().toISOString() };
    setViewed(next); saveStorage(STORAGE.viewed, next);
  };

  const savePrefs = (newPrefs) => {
    setPrefs(newPrefs); saveStorage(STORAGE.prefs, newPrefs);
  };

  // === SALARY FILTER ===
  const meetsSalary = (job) => {
    if (!job.salary) return true; // unknown = include
    const m = job.salary.match(/\$?(\d+)k/i);
    if (!m) return true;
    return parseInt(m[1]) >= prefs.minSalary;
  };

  // === WORK TYPE FILTER ===
  const meetsWorkType = (job) => {
    if (prefs.workType === "all") return true;
    const loc = (job.location || "").toLowerCase();
    const text = `${loc} ${(job.summary || "").toLowerCase()}`;
    if (prefs.workType === "remote") return /\bremote\b/.test(text);
    if (prefs.workType === "hybrid") return /\bhybrid\b/.test(text);
    if (prefs.workType === "onsite") return !/\b(remote|hybrid)\b/.test(text);
    return true;
  };

  // === ACTIVE FEED with sorting ===
  const activeFeed = useMemo(() => {
    return jobs
      .filter(j => !applied[j.id] && !hidden[j.id])
      .filter(meetsSalary)
      .filter(meetsWorkType)
      .map(j => ({ ...j, _status: getJobStatus(j, viewed) }))
      .sort((a, b) => {
        // 1. Unseen ("new" or "updated") before "viewed"
        const aViewed = a._status === "viewed";
        const bViewed = b._status === "viewed";
        if (aViewed !== bViewed) return aViewed ? 1 : -1;
        // 2. New today before "updated"
        if (a._status !== b._status) return a._status === "new" ? -1 : 1;
        // 3. Within group, by match score desc
        return (b.matchScore || 0) - (a.matchScore || 0);
      });
  }, [jobs, applied, hidden, viewed, prefs]);

  const fitFiltered = filter === "ALL" ? activeFeed : activeFeed.filter(j => j.fit === filter);

  const counts = {
    HIGH: activeFeed.filter(j => j.fit === "HIGH").length,
    MED: activeFeed.filter(j => j.fit === "MED").length,
    LOW: activeFeed.filter(j => j.fit === "LOW").length,
    new: activeFeed.filter(j => j._status === "new").length,
  };

  const appliedList = Object.values(applied).sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied));
  const hiddenList = Object.values(hidden).sort((a, b) => new Date(b.dateHidden) - new Date(a.dateHidden));

  return (
    <div style={{
      background: c.bg, minHeight: "100vh", color: c.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      transition: "background 0.2s"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${c.bg}; }
        ::-webkit-scrollbar-thumb { background: ${c.border}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${c.borderHover}; }
        button:hover, a:hover { filter: brightness(1.1); }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${c.border}`, padding: "14px 18px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, background: c.bg, zIndex: 30,
        backdropFilter: "blur(10px)"
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em", color: c.text }}>
            Matt's Job Radar
          </div>
          <div style={{ fontSize: 10, color: c.textMuted, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
            {jobs.length} listings · {appliedList.length} applied · {Object.keys(viewed).length} viewed
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setSettingsOpen(true)} style={{
            background: "transparent", border: `1px solid ${c.border}`,
            color: c.textDim, borderRadius: 7, padding: "7px 12px",
            fontSize: 12, fontWeight: 600, cursor: "pointer"
          }}>⚙</button>
          <button onClick={fetchJobs} disabled={loading} style={{
            background: loading ? "transparent" : c.blueBg,
            border: `1px solid ${loading ? c.border : c.blueBorder}`,
            color: loading ? c.textMuted : c.blue,
            borderRadius: 7, padding: "7px 14px", fontSize: 11.5, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 6, letterSpacing: "0.04em"
          }}>
            {loading
              ? <><span style={{ width: 9, height: 9, border: `2px solid ${c.border}`, borderTopColor: c.blue, borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />LOADING</>
              : "REFRESH"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${c.border}`, background: c.bg, position: "sticky", top: 56, zIndex: 29 }}>
        {[
          ["active", "New", activeFeed.length, c.accent],
          ["applied", "Applied", appliedList.length, c.accent],
          ["hidden", "Not Interested", hiddenList.length, c.red],
        ].map(([id, label, n, accent]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: "12px 0", background: "transparent", border: "none",
            borderBottom: `2px solid ${tab === id ? accent : "transparent"}`,
            color: tab === id ? c.text : c.textDim,
            fontSize: 12, fontWeight: tab === id ? 700 : 500,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            transition: "all 0.15s"
          }}>
            {label}
            <span style={{
              background: tab === id ? (accent === c.accent ? c.accentSoft : c.redBg) : (theme === "dark" ? "#1a1a1f" : "#f1f5f9"),
              color: tab === id ? accent : c.textMuted,
              border: `1px solid ${tab === id ? accent : c.border}40`,
              borderRadius: 20, padding: "0 7px", fontSize: 9.5, fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace"
            }}>{n}</span>
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "20px 16px 60px" }}>

        {/* Status row */}
        {lastUpdated && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.accent, boxShadow: `0 0 6px ${c.accent}` }} />
            <span style={{ color: c.accent, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
              {new Date(lastUpdated).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
            </span>
            {counts.new > 0 && (
              <span style={{ color: c.accent, fontSize: 11, fontWeight: 700 }}>· {counts.new} new today</span>
            )}
            <span style={{ color: c.textMuted, fontSize: 11 }}>· auto-refreshes 8 AM & 4 PM</span>
          </div>
        )}

        {error && (
          <div style={{ background: c.redBg, border: `1px solid ${c.red}40`, borderRadius: 8, padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ color: c.red, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Failed to load listings</div>
            <div style={{ color: c.red, fontSize: 12, marginBottom: 10, opacity: 0.8 }}>{error}</div>
            <button onClick={fetchJobs} style={{
              background: "transparent", border: `1px solid ${c.red}`,
              color: c.red, borderRadius: 5, padding: "6px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer"
            }}>Retry</button>
          </div>
        )}

        {tab === "active" && (
          <>
            {jobs.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                {[["ALL", activeFeed.length], ["HIGH", counts.HIGH], ["MED", counts.MED], ["LOW", counts.LOW]].map(([f, n]) => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    background: filter === f ? (theme === "dark" ? "#1a1a1f" : "#f1f5f9") : "transparent",
                    border: `1px solid ${filter === f ? c.borderHover : c.border}`,
                    color: filter === f
                      ? (f === "HIGH" ? FIT_COLORS.HIGH[theme] : f === "MED" ? FIT_COLORS.MED[theme] : f === "LOW" ? FIT_COLORS.LOW[theme] : c.text)
                      : c.textMuted,
                    borderRadius: 5, padding: "5px 12px", fontSize: 10.5, fontWeight: 700,
                    cursor: "pointer", fontFamily: "'JetBrains Mono', monospace"
                  }}>{f} {n}</button>
                ))}
              </div>
            )}

            {loading && jobs.length === 0 && (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <div style={{ width: 22, height: 22, border: `2px solid ${c.border}`, borderTopColor: c.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
                <div style={{ color: c.textMuted, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>Loading listings...</div>
              </div>
            )}

            {!loading && fitFiltered.length === 0 && jobs.length > 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: c.textMuted, fontSize: 13 }}>
                No new {filter !== "ALL" ? filter : ""} listings.
                <div style={{ color: c.textMuted, fontSize: 11, marginTop: 6, opacity: 0.7 }}>
                  Try adjusting your preferences (⚙ top right)
                </div>
              </div>
            )}

            {fitFiltered.map(job => (
              <div key={job.id} style={{ animation: "fadeIn 0.25s ease" }}>
                <JobCard
                  job={job}
                  isApplied={!!applied[job.id]}
                  isHidden={!!hidden[job.id]}
                  status={job._status}
                  theme={theme}
                  onApply={markApplied}
                  onHide={hide}
                  onUnhide={unhide}
                  onView={markViewed}
                />
              </div>
            ))}
          </>
        )}

        {tab === "applied" && (
          <>
            {appliedList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: c.textMuted, fontSize: 13 }}>
                No applications tracked yet.
              </div>
            ) : (
              <>
                <div style={{ color: c.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                  {appliedList.length} application{appliedList.length !== 1 ? "s" : ""}
                </div>
                {appliedList.map(entry => (
                  <HistoryRow key={entry.id} entry={entry} onAction={unapply} color="green" dateLabel={entry.dateApplied} theme={theme} />
                ))}
              </>
            )}
          </>
        )}

        {tab === "hidden" && (
          <>
            {hiddenList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: c.textMuted, fontSize: 13 }}>
                Nothing marked Not Interested.
              </div>
            ) : (
              <>
                <div style={{ color: c.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                  {hiddenList.length} hidden
                </div>
                {hiddenList.map(entry => (
                  <HistoryRow key={entry.id} entry={entry} onAction={unhide} color="red" dateLabel={entry.dateHidden} theme={theme} />
                ))}
              </>
            )}
          </>
        )}
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} prefs={prefs} onSave={savePrefs} theme={theme} />
    </div>
  );
}
