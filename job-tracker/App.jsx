import { useState, useEffect, useCallback } from "react";

const FIT = {
  HIGH: { bg: "#0a2416", color: "#4ade80", border: "#14532d" },
  MED:  { bg: "#1a1500", color: "#fbbf24", border: "#713f12" },
  LOW:  { bg: "#1a0a0a", color: "#f87171", border: "#7f1d1d" },
};

const STORAGE = {
  applied: "matt_jobs_applied_v1",
  hidden: "matt_jobs_hidden_v1",  // now stores full job data, not just true/false
};

function loadStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveStorage(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

function FitBadge({ fit }) {
  const c = FIT[fit] || FIT.MED;
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 3, padding: "1px 7px", fontSize: 10,
      fontWeight: 700, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace"
    }}>{fit}</span>
  );
}

function JobCard({ job, isApplied, onApply, onHide, onUnhide, isHidden, autoExpandSummary }) {
  const [open, setOpen] = useState(autoExpandSummary || false);
  const c = FIT[job.fit] || FIT.MED;

  return (
    <div style={{
      background: isApplied ? "#0a0f0a" : isHidden ? "#0d0a0a" : "#0b0b0b",
      border: `1px solid ${isApplied ? "#14532d" : isHidden ? "#3a1a1a" : "#1a1a1a"}`,
      borderLeft: `3px solid ${c.border}`,
      borderRadius: 8, marginBottom: 10, overflow: "hidden",
      transition: "all 0.2s",
    }}>
      <div style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4, alignItems: "center" }}>
            <FitBadge fit={job.fit} />
            <span style={{ color: "#2a2a2a", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>{job.platform}</span>
            <span style={{ color: "#252525", fontSize: 10 }}>{job.posted}</span>
            {isApplied && <span style={{ color: "#4ade80", fontSize: 10, fontWeight: 700 }}>✓ APPLIED</span>}
            {isHidden && <span style={{ color: "#f87171", fontSize: 10, fontWeight: 700 }}>✗ NOT INTERESTED</span>}
          </div>
          <div style={{ color: "#ebebeb", fontWeight: 600, fontSize: 14, marginBottom: 2, lineHeight: 1.3 }}>{job.title}</div>
          <div style={{ color: "#555", fontSize: 12 }}>{job.company}{job.location ? ` · ${job.location}` : ""}</div>
          {job.salary && (
            <div style={{ color: c.color, fontSize: 11, marginTop: 4, opacity: 0.9, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
              💰 {job.salary}
            </div>
          )}
          {job.fitReason && (
            <div style={{ color: "#383838", fontSize: 11, marginTop: 5, fontStyle: "italic", lineHeight: 1.5 }}>{job.fitReason}</div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
          {job.applyUrl && (
            <a href={job.applyUrl} target="_blank" rel="noreferrer" style={{
              background: c.bg, color: c.color, border: `1px solid ${c.border}`,
              borderRadius: 5, padding: "5px 11px", fontSize: 11, fontWeight: 600,
              textDecoration: "none", textAlign: "center", whiteSpace: "nowrap"
            }}>Apply →</a>
          )}
          {!isHidden && (
            <button onClick={() => onApply(job)} style={{
              background: isApplied ? "#0a2416" : "transparent",
              border: `1px solid ${isApplied ? "#14532d" : "#1e1e1e"}`,
              color: isApplied ? "#4ade80" : "#444",
              borderRadius: 5, padding: "5px 11px", fontSize: 11,
              cursor: "pointer", whiteSpace: "nowrap"
            }}>{isApplied ? "Applied ✓" : "Mark Applied"}</button>
          )}
          {isHidden ? (
            <button onClick={() => onUnhide(job)} style={{
              background: "transparent", border: "1px solid #2a2a2a",
              color: "#666", borderRadius: 5, padding: "5px 11px",
              fontSize: 11, cursor: "pointer", whiteSpace: "nowrap"
            }}>↶ Restore</button>
          ) : (
            <button onClick={() => setOpen(v => !v)} style={{
              background: "transparent", border: "1px solid #181818",
              color: "#444", borderRadius: 5, padding: "5px 11px",
              fontSize: 11, cursor: "pointer"
            }}>{open ? "Less" : "More"}</button>
          )}
        </div>
      </div>

      {open && !isHidden && (
        <div style={{ borderTop: "1px solid #111", padding: "14px 16px", background: "#070707" }}>
          {job.summary ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#2a2a2a", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Description</div>
              <p style={{ color: "#aaa", fontSize: 12, lineHeight: 1.7, margin: 0 }}>{job.summary}</p>
            </div>
          ) : (
            <div style={{ color: "#444", fontSize: 11, fontStyle: "italic", marginBottom: 12 }}>
              No description available — click Apply to view full posting.
            </div>
          )}
          {job.keyMatch?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: "#2a2a2a", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Matches</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {job.keyMatch.map((m, i) => (
                  <span key={i} style={{ background: "#111", border: "1px solid #1e1e1e", color: "#666", borderRadius: 3, padding: "2px 8px", fontSize: 11 }}>{m}</span>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => onHide(job)} style={{
            background: "transparent", border: "1px solid #2a1a1a",
            color: "#7f3030", borderRadius: 5, padding: "5px 12px",
            fontSize: 11, cursor: "pointer"
          }}>Not Interested</button>
        </div>
      )}
    </div>
  );
}

function HistoryRow({ entry, onAction, actionLabel, color, dateLabel }) {
  const c = FIT[entry.fit] || FIT.MED;
  return (
    <div style={{
      background: "#0b0b0b",
      border: `1px solid ${color === "green" ? "#14532d" : "#3a1a1a"}`,
      borderLeft: `3px solid ${c.border}`,
      borderRadius: 7, padding: "12px 14px", marginBottom: 8,
      display: "flex", alignItems: "center", gap: 12
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 3 }}>
          <FitBadge fit={entry.fit} />
          {color === "green"
            ? <span style={{ color: "#4ade80", fontSize: 10, fontWeight: 700 }}>✓ APPLIED</span>
            : <span style={{ color: "#f87171", fontSize: 10, fontWeight: 700 }}>✗ NOT INTERESTED</span>}
          {dateLabel && <span style={{ color: "#222", fontSize: 10 }}>{dateLabel}</span>}
        </div>
        <div style={{ color: "#e0e0e0", fontWeight: 600, fontSize: 13 }}>{entry.title}</div>
        <div style={{ color: "#555", fontSize: 11 }}>{entry.company}{entry.location ? ` · ${entry.location}` : ""}</div>
        {entry.salary && <div style={{ color: c.color, fontSize: 10, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{entry.salary}</div>}
      </div>
      {entry.applyUrl && (
        <a href={entry.applyUrl} target="_blank" rel="noreferrer" style={{
          background: "transparent",
          border: `1px solid ${color === "green" ? "#14532d" : "#3a1a1a"}`,
          color: color === "green" ? "#4ade80" : "#f87171",
          borderRadius: 4, padding: "4px 10px",
          fontSize: 10, textDecoration: "none", whiteSpace: "nowrap"
        }}>View</a>
      )}
      <button onClick={() => onAction(entry.id)} title={actionLabel} style={{
        background: "transparent", border: "1px solid #1a1a1a",
        color: "#333", borderRadius: 4, padding: "4px 9px",
        fontSize: 10, cursor: "pointer"
      }}>↶</button>
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

  const [applied, setApplied] = useState(() => loadStorage(STORAGE.applied, {}));
  const [hidden, setHidden] = useState(() => loadStorage(STORAGE.hidden, {}));

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
    const next = { ...applied };
    delete next[id];
    setApplied(next);
    saveStorage(STORAGE.applied, next);
  };

  const hide = (job) => {
    const next = { ...hidden };
    next[job.id] = {
      id: job.id, title: job.title, company: job.company,
      location: job.location, fit: job.fit, applyUrl: job.applyUrl,
      platform: job.platform, salary: job.salary,
      dateHidden: new Date().toLocaleDateString(),
    };
    setHidden(next);
    saveStorage(STORAGE.hidden, next);
  };

  const unhide = (job) => {
    const id = typeof job === "string" ? job : job.id;
    const next = { ...hidden };
    delete next[id];
    setHidden(next);
    saveStorage(STORAGE.hidden, next);
  };

  // Active feed: not applied AND not hidden
  const activeFeed = jobs.filter(j => !applied[j.id] && !hidden[j.id]);
  const fitFiltered = filter === "ALL" ? activeFeed : activeFeed.filter(j => j.fit === filter);

  const counts = {
    HIGH: activeFeed.filter(j => j.fit === "HIGH").length,
    MED: activeFeed.filter(j => j.fit === "MED").length,
    LOW: activeFeed.filter(j => j.fit === "LOW").length,
  };

  const appliedList = Object.values(applied).sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied));
  const hiddenList = Object.values(hidden).sort((a, b) => new Date(b.dateHidden) - new Date(a.dateHidden));

  return (
    <div style={{ background: "#060606", minHeight: "100vh", color: "#f0f0f0", fontFamily: "'Syne', 'Helvetica Neue', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #1e1e1e; border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: "1px solid #111", padding: "13px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, background: "#060606", zIndex: 20
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.06em" }}>MATT'S JOB RADAR</div>
          <div style={{ fontSize: 9, color: "#2a2a2a", fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
            {jobs.length} listings · {appliedList.length} applied · {hiddenList.length} hidden
          </div>
        </div>
        <button onClick={fetchJobs} disabled={loading} style={{
          background: loading ? "#0a0a0a" : "#0f1e36",
          border: `1px solid ${loading ? "#1a1a1a" : "#1e3a5f"}`,
          color: loading ? "#333" : "#60a5fa",
          borderRadius: 6, padding: "7px 14px",
          fontSize: 11, fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", gap: 6, letterSpacing: "0.05em"
        }}>
          {loading ? (
            <>
              <span style={{ width: 9, height: 9, border: "2px solid #333", borderTopColor: "#60a5fa", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
              LOADING
            </>
          ) : "REFRESH"}
        </button>
      </div>

      {/* Three tabs now */}
      <div style={{ display: "flex", borderBottom: "1px solid #111", background: "#060606", position: "sticky", top: 53, zIndex: 19 }}>
        {[
          ["active", "New", activeFeed.length, "#4ade80"],
          ["applied", "Applied", appliedList.length, "#4ade80"],
          ["hidden", "Not Interested", hiddenList.length, "#f87171"],
        ].map(([id, label, n, accent]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: "11px 0", background: "transparent", border: "none",
            borderBottom: `2px solid ${tab === id ? accent : "transparent"}`,
            color: tab === id ? "#f0f0f0" : "#444",
            fontSize: 11, fontWeight: tab === id ? 700 : 400,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
          }}>
            {label}
            <span style={{
              background: tab === id ? (accent === "#4ade80" ? "#0a2416" : "#1a0a0a") : "#111",
              color: tab === id ? accent : "#444",
              border: `1px solid ${tab === id ? (accent === "#4ade80" ? "#14532d" : "#3a1a1a") : "#1e1e1e"}`,
              borderRadius: 20, padding: "0 6px",
              fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace"
            }}>{n}</span>
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "18px 14px" }}>

        {lastUpdated && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block", boxShadow: "0 0 6px #4ade80" }} />
            <span style={{ color: "#4ade80", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
              Updated {new Date(lastUpdated).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
            </span>
            <span style={{ color: "#222", fontSize: 11 }}>· auto-refreshes 8 AM & 4 PM</span>
          </div>
        )}

        {error && (
          <div style={{ background: "#1a0a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ color: "#f87171", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Failed to load listings</div>
            <div style={{ color: "#a85050", fontSize: 12, marginBottom: 10 }}>{error}</div>
            <button onClick={fetchJobs} style={{
              background: "#1f0a0a", border: "1px solid #7f1d1d",
              color: "#f87171", borderRadius: 5, padding: "6px 14px",
              fontSize: 11, fontWeight: 600, cursor: "pointer"
            }}>Retry</button>
          </div>
        )}

        {tab === "active" && (
          <>
            {jobs.length > 0 && (
              <div style={{ display: "flex", gap: 5, marginBottom: 14, flexWrap: "wrap" }}>
                {[["ALL", activeFeed.length], ["HIGH", counts.HIGH], ["MED", counts.MED], ["LOW", counts.LOW]].map(([f, n]) => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    background: filter === f ? "#111" : "transparent",
                    border: `1px solid ${filter === f ? "#222" : "#141414"}`,
                    color: filter === f ? (f === "HIGH" ? "#4ade80" : f === "MED" ? "#fbbf24" : f === "LOW" ? "#f87171" : "#f0f0f0") : "#333",
                    borderRadius: 4, padding: "4px 11px",
                    fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace"
                  }}>{f} {n}</button>
                ))}
              </div>
            )}

            {loading && jobs.length === 0 && (
              <div style={{ textAlign: "center", padding: "70px 0" }}>
                <div style={{ width: 20, height: 20, border: "2px solid #1a1a1a", borderTopColor: "#4ade80", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
                <div style={{ color: "#2a2a2a", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>Loading listings...</div>
              </div>
            )}

            {!loading && fitFiltered.length === 0 && jobs.length > 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#2a2a2a", fontSize: 13 }}>
                No new {filter !== "ALL" ? filter : ""} listings.
                <div style={{ color: "#1a1a1a", fontSize: 11, marginTop: 6 }}>
                  All matching jobs have been applied to or marked Not Interested.
                </div>
              </div>
            )}

            {fitFiltered.map(job => (
              <div key={job.id} style={{ animation: "fadeIn 0.25s ease" }}>
                <JobCard
                  job={job}
                  isApplied={false}
                  isHidden={false}
                  onApply={markApplied}
                  onHide={hide}
                  onUnhide={unhide}
                />
              </div>
            ))}

            {!loading && jobs.length === 0 && !error && (
              <div style={{ textAlign: "center", padding: "70px 0", color: "#2a2a2a", fontSize: 13 }}>
                No listings yet — first scrape pending.
                <div style={{ color: "#1a1a1a", fontSize: 11, marginTop: 6 }}>
                  Tap REFRESH or wait for the next scheduled run.
                </div>
              </div>
            )}
          </>
        )}

        {tab === "applied" && (
          <>
            {appliedList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "70px 0", color: "#2a2a2a", fontSize: 13 }}>
                No applications tracked yet.
              </div>
            ) : (
              <>
                <div style={{ color: "#444", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                  {appliedList.length} application{appliedList.length !== 1 ? "s" : ""}
                </div>
                {appliedList.map(entry => (
                  <HistoryRow
                    key={entry.id}
                    entry={entry}
                    onAction={unapply}
                    actionLabel="Unmark applied"
                    color="green"
                    dateLabel={entry.dateApplied}
                  />
                ))}
              </>
            )}
          </>
        )}

        {tab === "hidden" && (
          <>
            {hiddenList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "70px 0", color: "#2a2a2a", fontSize: 13 }}>
                Nothing marked Not Interested.
                <div style={{ color: "#1a1a1a", fontSize: 11, marginTop: 6 }}>
                  Tap "Not Interested" on any listing to hide it from your feed.
                </div>
              </div>
            ) : (
              <>
                <div style={{ color: "#444", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                  {hiddenList.length} hidden listing{hiddenList.length !== 1 ? "s" : ""}
                </div>
                {hiddenList.map(entry => (
                  <HistoryRow
                    key={entry.id}
                    entry={entry}
                    onAction={unhide}
                    actionLabel="Restore"
                    color="red"
                    dateLabel={entry.dateHidden}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
