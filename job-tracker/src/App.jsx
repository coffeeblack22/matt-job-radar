import { useState, useEffect, useCallback, useMemo } from "react";

// ========== STORAGE ==========
const STORAGE = {
  applied: "matt_jobs_applied_v2",
  interested: "matt_jobs_interested_v3",
  hidden: "matt_jobs_hidden_v2",
  viewed: "matt_jobs_viewed_v2",
  prefs: "matt_jobs_prefs_v2",
};
const DEFAULT_PREFS = { minSalary: 70, workType: "all" };

function loadStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function saveStorage(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

const CATEGORY_LABELS = {
  finance_adjacent: "🏦 Finance Adjacent",
  fintech_tech: "🚀 Fintech / Tech",
  high_trust: "⚡ High Trust / Growth",
};

function getJobStatus(job, viewedMap) {
  if (viewedMap[job.id]) return "viewed";
  const recent = /\b(just now|today|0d|1h|2h|3h|4h|5h|6h|7h|8h|9h|10h|11h|12h|13h|14h|15h|16h|17h|18h|19h|20h|21h|22h|23h)\b/i.test(job.posted || "");
  return recent ? "new" : "updated";
}

// Snapshot of a job for permanent log entries
function snapshotJob(job, extraFields = {}) {
  return {
    id: job.id, title: job.title, company: job.company, location: job.location,
    fit: job.fit, applyUrl: job.applyUrl, platform: job.platform, salary: job.salary,
    matchScore: job.matchScore, summary: job.summary, fitReason: job.fitReason,
    keyMatch: job.keyMatch, missingSkills: job.missingSkills,
    lane: job.lane, expandedCategory: job.expandedCategory,
    ...extraFields,
  };
}

// "Opened Xm/h ago" relative formatter
function formatRelative(isoDate) {
  if (!isoDate) return "";
  try {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch { return ""; }
}

// ========== ALL CSS ==========
const CSS = `
  *, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin: 0; padding: 0; background: #0a0d0c; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #e8e9eb;
    overflow-x: hidden;
    min-height: 100vh;
    min-height: 100dvh;
  }

  /* ===== REFINED BACKGROUND - graphite base, forest only at corners ===== */
  .forest-bg {
    position: fixed; inset: 0; z-index: -2;
    background:
      radial-gradient(ellipse 70% 50% at 15% 5%, rgba(40, 75, 50, 0.22) 0%, transparent 55%),
      radial-gradient(ellipse 60% 50% at 85% 90%, rgba(30, 60, 42, 0.25) 0%, transparent 60%),
      linear-gradient(180deg, #0a0d0c 0%, #0f1411 50%, #0b0e0d 100%);
  }
  .botanical-overlay {
    position: fixed; inset: 0; z-index: -1; pointer-events: none; opacity: 0.10;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'><defs><filter id='blur'><feGaussianBlur stdDeviation='3'/></filter></defs><g fill='%2334a853' filter='url(%23blur)'><path d='M50 400 Q 80 350 100 380 Q 120 360 110 410 Q 90 430 60 420 Q 40 410 50 400 Z' opacity='0.4'/><path d='M700 200 Q 730 150 760 180 Q 770 210 740 230 Q 710 220 700 200 Z' opacity='0.3'/><path d='M150 700 Q 200 650 240 680 Q 250 720 200 740 Q 160 730 150 700 Z' opacity='0.35'/><path d='M650 600 Q 690 570 710 590 Q 720 620 690 640 Q 660 630 650 600 Z' opacity='0.3'/></g></svg>");
    background-size: 100% 100%;
  }
  .grain {
    position: fixed; inset: 0; z-index: -1; pointer-events: none; opacity: 0.04;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  }

  /* ===== HEADER ===== */
  .header {
    position: sticky; top: 0; z-index: 50;
    padding: max(14px, env(safe-area-inset-top)) 18px 14px;
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    background: rgba(10, 13, 12, 0.7);
    backdrop-filter: blur(28px) saturate(160%);
    -webkit-backdrop-filter: blur(28px) saturate(160%);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .brand-name {
    font-family: 'Fraunces', serif;
    font-size: 19px; font-weight: 600; letter-spacing: -0.02em;
    color: #f5f6f8;
  }
  .brand-sub {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px; color: #6b6e6c; margin-top: 2px; letter-spacing: 0.04em;
  }
  .icon-btn {
    width: 38px; height: 38px; border-radius: 12px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    color: #b4b8b6; font-size: 16px;
    cursor: pointer; transition: all 0.2s;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .icon-btn:hover, .icon-btn:active {
    background: rgba(255,255,255,0.09); transform: scale(0.96);
  }
  .btn-refresh {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    color: #d4d8d6;
    padding: 8px 14px; border-radius: 11px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
    display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
    transition: all 0.2s;
    font-family: inherit; white-space: nowrap;
  }
  .btn-refresh:hover { background: rgba(255,255,255,0.08); }
  .btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ===== LANE TOGGLE ===== */
  .lane-toggle-wrap { max-width: 820px; margin: 0 auto; padding: 16px 16px 0; }
  .lane-toggle {
    background: rgba(15, 20, 17, 0.55);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 18px;
    padding: 5px;
    display: flex; gap: 4px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04);
  }
  .lane-btn {
    flex: 1; padding: 11px 14px;
    background: transparent; border: 1px solid transparent;
    color: #8a8d8b; font-size: 12.5px; font-weight: 600;
    border-radius: 13px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 7px;
    transition: all 0.25s cubic-bezier(0.4, 0.0, 0.2, 1);
    font-family: inherit;
  }
  .lane-btn.active {
    background: linear-gradient(180deg, rgba(74, 222, 128, 0.18) 0%, rgba(50, 165, 90, 0.08) 100%);
    color: #f5f6f8;
    box-shadow: 0 2px 8px rgba(74, 222, 128, 0.15), inset 0 1px 0 rgba(255,255,255,0.08);
    border: 1px solid rgba(74, 222, 128, 0.28);
  }
  .lane-btn.active.expanded {
    background: linear-gradient(180deg, rgba(196, 184, 150, 0.16) 0%, rgba(160, 145, 110, 0.08) 100%);
    box-shadow: 0 2px 8px rgba(196, 184, 150, 0.12), inset 0 1px 0 rgba(255,255,255,0.08);
    border-color: rgba(196, 184, 150, 0.28);
  }
  .lane-count {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px; padding: 1px 7px; border-radius: 8px;
    background: rgba(255,255,255,0.06);
    color: #b4b8b6; font-weight: 700;
  }
  .lane-btn.active .lane-count { background: rgba(74, 222, 128, 0.18); color: #a7e9bd; }
  .lane-btn.active.expanded .lane-count { background: rgba(196, 184, 150, 0.18); color: #d8c8a8; }

  /* ===== TABS - 4 NOW ===== */
  .tabs-wrap {
    max-width: 820px; margin: 16px auto 0;
    padding: 0 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex; gap: 2px;
    overflow-x: auto;
  }
  .tab {
    flex: 1; padding: 11px 0 13px;
    background: transparent; border: none;
    color: #8a8d8b; font-size: 11.5px; font-weight: 500;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    border-bottom: 2px solid transparent;
    transition: all 0.2s; font-family: inherit; white-space: nowrap;
  }
  .tab.active { color: #f5f6f8; font-weight: 700; border-bottom-color: #4ade80; }
  .tab.active.amber { border-bottom-color: #f5b849; }
  .tab.active.red { border-bottom-color: #ef9a9a; }
  .tab-count {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px; padding: 1px 6px; border-radius: 8px;
    background: rgba(255,255,255,0.06); color: #8a8d8b; font-weight: 700;
  }
  .tab.active .tab-count { background: rgba(74, 222, 128, 0.2); color: #a7e9bd; }
  .tab.active.amber .tab-count { background: rgba(245, 184, 73, 0.2); color: #f5cc8d; }
  .tab.active.red .tab-count { background: rgba(239, 154, 154, 0.18); color: #f5b8b8; }

  /* ===== CONTENT ===== */
  .content { max-width: 820px; margin: 0 auto; padding: 16px 16px 100px; }

  .status-line { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .pulse-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #4ade80; box-shadow: 0 0 8px #4ade80, 0 0 16px rgba(74, 222, 128, 0.3);
    animation: pulse 2s ease-in-out infinite;
  }
  .pulse-dot.expanded { background: #c4b896; box-shadow: 0 0 8px #c4b896, 0 0 16px rgba(196, 184, 150, 0.3); }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }
  .status-text { color: #b4b8b6; font-size: 11px; font-family: 'JetBrains Mono', monospace; }
  .status-meta { color: #6b6e6c; font-size: 11px; }

  /* ===== SECTION NOTE - for Interested tab guidance ===== */
  .section-note {
    background: rgba(245, 184, 73, 0.06);
    border: 1px solid rgba(245, 184, 73, 0.18);
    border-radius: 12px;
    padding: 11px 14px; margin-bottom: 14px;
    color: #c4b896; font-size: 11.5px; line-height: 1.5;
  }
  .section-note strong { color: #f5b849; }

  /* ===== FILTER CHIPS ===== */
  .chip-row { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
  .chip {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.08);
    color: #8a8d8b; font-size: 10.5px; font-weight: 700;
    padding: 5px 12px; border-radius: 8px;
    cursor: pointer; font-family: 'JetBrains Mono', monospace;
    transition: all 0.2s;
  }
  .chip:hover { background: rgba(255,255,255,0.04); }
  .chip.active { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.18); color: #f5f6f8; }
  .chip.high.active { color: #4ade80; border-color: rgba(74, 222, 128, 0.4); }
  .chip.med.active { color: #f5b849; border-color: rgba(245, 184, 73, 0.4); }
  .chip.low.active { color: #ef9a9a; border-color: rgba(239, 154, 154, 0.4); }

  .cat-chip {
    background: transparent; border: 1px solid rgba(255,255,255,0.08);
    color: #8a8d8b; font-size: 11px; font-weight: 600;
    padding: 5px 11px; border-radius: 10px; cursor: pointer;
    font-family: inherit; transition: all 0.2s;
  }
  .cat-chip:hover { background: rgba(255,255,255,0.04); }
  .cat-chip.active {
    background: rgba(196, 184, 150, 0.12);
    border-color: rgba(196, 184, 150, 0.32);
    color: #d8c8a8;
  }

  /* ===== CARDS - NEUTRAL GLASS ===== */
  .job-card {
    margin-bottom: 14px;
    background: rgba(22, 26, 24, 0.55);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 22px;
    overflow: hidden; position: relative;
    transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
    box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
    animation: slideUp 0.4s cubic-bezier(0.4, 0.0, 0.2, 1) backwards;
  }
  .job-card::before {
    content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
    background: linear-gradient(180deg, var(--accent), transparent); opacity: 0.85;
  }
  .job-card:hover {
    transform: translateY(-2px);
    border-color: rgba(255,255,255,0.12);
    box-shadow: 0 12px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08);
  }
  .job-card.fit-HIGH { --accent: #4ade80; --accent-soft: rgba(74, 222, 128, 0.1); }
  .job-card.fit-MED { --accent: #f5b849; --accent-soft: rgba(245, 184, 73, 0.1); }
  .job-card.fit-LOW { --accent: #ef9a9a; --accent-soft: rgba(239, 154, 154, 0.1); }
  .job-card.interested-card {
    background: rgba(35, 30, 18, 0.55);
    border-color: rgba(245, 184, 73, 0.18);
  }
  .job-card.applied-card {
    background: rgba(20, 38, 26, 0.5);
    border-color: rgba(74, 222, 128, 0.18);
  }
  .job-card.hidden-card {
    background: rgba(35, 22, 22, 0.4);
    border-color: rgba(239, 154, 154, 0.18);
    opacity: 0.85;
  }
  .job-card.viewed { opacity: 0.78; }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .card-body { padding: 16px 18px; display: flex; gap: 12px; align-items: flex-start; }
  .card-main { flex: 1; min-width: 0; }
  .card-actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }

  /* ===== BADGES ===== */
  .badge-row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; }
  .badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em;
    padding: 3px 8px; border-radius: 6px; border: 1px solid;
  }
  .badge-new { color: #4ade80; background: rgba(74, 222, 128, 0.1); border-color: rgba(74, 222, 128, 0.28); }
  .badge-updated { color: #b4b8b6; background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); }
  .badge-viewed { color: #6b6e6c; background: transparent; border-color: rgba(110, 114, 112, 0.3); }
  .badge-fit { color: var(--accent); background: var(--accent-soft); border-color: rgba(255,255,255,0.08); font-weight: 800; }
  .badge-cat {
    color: #c4b896; background: rgba(196, 184, 150, 0.08);
    border-color: rgba(196, 184, 150, 0.22);
    font-family: 'Inter', sans-serif; font-size: 10px;
    font-weight: 600; letter-spacing: 0.02em; text-transform: none;
  }
  .badge-platform { font-family: 'JetBrains Mono', monospace; font-size: 9.5px; color: #6b6e6c; padding: 0; border: none; }
  .badge-interested { color: #f5b849; background: rgba(245, 184, 73, 0.1); border-color: rgba(245, 184, 73, 0.3); }
  .badge-applied-tag { color: #4ade80; font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; }
  .badge-declined-tag { color: #ef9a9a; font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; }

  /* ===== TYPOGRAPHY ===== */
  .job-title {
    font-family: 'Fraunces', serif;
    font-size: 16px; font-weight: 600; letter-spacing: -0.015em;
    color: #f5f6f8; line-height: 1.3; margin-bottom: 4px;
  }
  .job-meta { font-size: 12.5px; color: #9ea3a0; margin-bottom: 10px; }

  .match-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
  .match-capsule {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px; border-radius: 10px;
    background: linear-gradient(135deg, rgba(74, 222, 128, 0.12) 0%, rgba(74, 222, 128, 0.04) 100%);
    border: 1px solid rgba(74, 222, 128, 0.28);
  }
  .match-capsule .pct { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 800; color: #4ade80; }
  .match-capsule .label { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; color: #8a8d8b; }
  .match-capsule.med {
    background: linear-gradient(135deg, rgba(245, 184, 73, 0.12) 0%, rgba(245, 184, 73, 0.04) 100%);
    border-color: rgba(245, 184, 73, 0.28);
  }
  .match-capsule.med .pct { color: #f5b849; }
  .match-capsule.low {
    background: linear-gradient(135deg, rgba(239, 154, 154, 0.12) 0%, rgba(239, 154, 154, 0.04) 100%);
    border-color: rgba(239, 154, 154, 0.28);
  }
  .match-capsule.low .pct { color: #ef9a9a; }

  .salary { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600; color: var(--accent); }

  .fit-reason { color: #8a8d8b; font-size: 11.5px; line-height: 1.5; font-style: italic; }
  .fit-reason.expanded { color: #c4b896; font-style: normal; font-weight: 500; }
  .fit-reason.expanded strong { color: #d8c8a8; font-weight: 700; }
  .fit-reason.prompt { color: #c4b896; font-style: normal; }

  /* ===== BUTTONS ===== */
  .btn {
    padding: 7px 14px; border-radius: 11px;
    font-size: 11.5px; font-weight: 600; cursor: pointer; white-space: nowrap;
    transition: all 0.2s; text-decoration: none; text-align: center;
    font-family: inherit; border: 1px solid; display: inline-block;
  }
  /* Apply: primary green action */
  .btn-apply {
    background: linear-gradient(180deg, rgba(74, 222, 128, 0.18) 0%, rgba(50, 165, 90, 0.08) 100%);
    border-color: rgba(74, 222, 128, 0.4); color: #4ade80;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 6px rgba(74, 222, 128, 0.12);
  }
  .btn-apply:hover { transform: translateY(-1px); }
  /* Yes I Applied: confirm */
  .btn-confirm {
    background: linear-gradient(180deg, rgba(74, 222, 128, 0.2) 0%, rgba(50, 165, 90, 0.1) 100%);
    border-color: rgba(74, 222, 128, 0.45); color: #4ade80;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
  }
  .btn-confirm:hover { transform: translateY(-1px); }
  /* Secondary - truly neutral */
  .btn-secondary {
    background: rgba(255,255,255,0.04);
    border-color: rgba(255,255,255,0.1);
    color: #b4b8b6;
  }
  .btn-secondary:hover { background: rgba(255,255,255,0.07); color: #d4d8d6; }
  /* Decline */
  .btn-decline {
    background: rgba(239, 154, 154, 0.06);
    border-color: rgba(239, 154, 154, 0.28);
    color: #ef9a9a;
  }
  .btn-decline:hover { background: rgba(239, 154, 154, 0.1); }

  /* ===== EXPANDED CARD DETAIL ===== */
  .card-detail {
    border-top: 1px solid rgba(255,255,255,0.06);
    padding: 16px 18px;
    background: rgba(0,0,0,0.15);
  }
  .detail-text { color: #b4b8b6; font-size: 13px; line-height: 1.7; margin-bottom: 14px; }
  .detail-text.empty { color: #6b6e6c; font-style: italic; font-size: 12px; }
  .detail-section { margin-bottom: 14px; }
  .detail-label {
    color: #8a8d8b; font-size: 9px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 7px;
  }
  .detail-label.warn { color: #f5b849; }
  .skill-tag {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    color: #9ea3a0;
    border-radius: 6px; padding: 3px 9px; font-size: 11px;
    display: inline-block; margin: 0 6px 6px 0;
  }
  .skill-tag.warn {
    background: rgba(245, 184, 73, 0.08);
    border-color: rgba(245, 184, 73, 0.28);
    color: #f5b849;
  }

  /* ===== EMPTY ===== */
  .empty-state { text-align: center; padding: 80px 16px; }
  .empty-text { color: #8a8d8b; font-size: 13px; margin-bottom: 6px; }
  .empty-sub { color: #6b6e6c; font-size: 11px; opacity: 0.8; }

  /* ===== SPINNER ===== */
  .spinner {
    width: 22px; height: 22px;
    border: 2px solid rgba(255,255,255,0.1);
    border-top-color: #4ade80; border-radius: 50%;
    animation: spin 0.8s linear infinite;
    display: inline-block;
  }
  .spinner.small { width: 9px; height: 9px; border-width: 2px; vertical-align: middle; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ===== MODAL ===== */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.7);
    backdrop-filter: blur(8px); z-index: 100;
    display: flex; align-items: center; justify-content: center; padding: 16px;
    animation: fadeIn 0.2s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal-panel {
    background: rgba(15, 20, 17, 0.95);
    backdrop-filter: blur(40px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 24px; padding: 24px;
    max-width: 440px; width: 100%;
    box-shadow: 0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
    animation: slideUp 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
  }
  .modal-title { font-family: 'Fraunces', serif; color: #f5f6f8; font-size: 18px; font-weight: 600; }
  .modal-sub { color: #6b6e6c; font-size: 11.5px; margin-top: 2px; }
  .form-label {
    display: block; color: #8a8d8b; font-size: 11px; font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px;
  }
  .salary-display {
    color: #f5f6f8; font-size: 22px; font-weight: 700; margin-top: 6px;
    font-family: 'JetBrains Mono', monospace;
  }
  .pill-group { display: flex; gap: 6px; flex-wrap: wrap; }
  .pill {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.1);
    color: #8a8d8b;
    border-radius: 11px; padding: 8px 16px; font-size: 12px; font-weight: 600;
    cursor: pointer; font-family: inherit; transition: all 0.2s;
  }
  .pill:hover { background: rgba(255,255,255,0.04); }
  .pill.active {
    background: rgba(74, 222, 128, 0.15);
    border-color: rgba(74, 222, 128, 0.4);
    color: #4ade80;
  }
  input[type="range"] { width: 100%; accent-color: #4ade80; }

  /* History row simple */
  .history-row {
    background: rgba(22, 26, 24, 0.55);
    backdrop-filter: blur(24px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.06);
    border-left: 3px solid var(--accent);
    border-radius: 14px;
    padding: 13px 15px; margin-bottom: 9px;
  }
  .history-row.applied { --accent: #4ade80; }
  .history-row.hidden { --accent: #ef9a9a; opacity: 0.85; }

  @media (max-width: 480px) {
    .card-body { padding: 14px 16px; }
    .job-title { font-size: 15px; }
    .header { padding-left: 14px; padding-right: 14px; }
    .lane-toggle-wrap { padding: 16px 12px 0; }
    .tabs-wrap { padding: 0 12px; }
    .content { padding: 16px 12px 100px; }
  }
`;

// ========== COMPONENTS ==========
function StatusBadge({ status }) {
  const cfg = {
    new: { label: "🟢 NEW", cls: "badge-new" },
    updated: { label: "🔁 UPDATED", cls: "badge-updated" },
    viewed: { label: "👀 VIEWED", cls: "badge-viewed" },
  }[status];
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}

function MatchScore({ score }) {
  const tier = score >= 80 ? "" : score >= 60 ? "med" : "low";
  return (
    <div className={`match-capsule ${tier}`}>
      <span className="pct">{score}%</span>
      <span className="label">MATCH</span>
    </div>
  );
}

// === NEW TAB CARD ===
function NewCard({ job, status, onApplyClick, onView }) {
  const [open, setOpen] = useState(false);
  const isExpanded = job.lane === "expanded";
  const cls = `job-card fit-${job.fit || "MED"}${status === "viewed" ? " viewed" : ""}`;

  const handleApply = (e) => {
    // Triggers both: open the URL AND auto-route to Interested
    onView(job);
    onApplyClick(job);
  };

  return (
    <div className={cls}>
      <div className="card-body">
        <div className="card-main">
          <div className="badge-row">
            <StatusBadge status={status} />
            <span className="badge badge-fit">{job.fit}</span>
            {isExpanded && job.expandedCategory && (
              <span className="badge badge-cat">{CATEGORY_LABELS[job.expandedCategory]}</span>
            )}
            <span className="badge-platform">{job.platform} · {job.posted}</span>
          </div>
          <div className="job-title">{job.title}</div>
          <div className="job-meta">{job.company}{job.location ? ` · ${job.location}` : ""}</div>
          <div className="match-row">
            {job.matchScore && <MatchScore score={job.matchScore} />}
            {job.salary && <span className="salary">💰 {job.salary}</span>}
          </div>
          {job.fitReason && (
            <div className={`fit-reason ${isExpanded ? "expanded" : ""}`}>
              {isExpanded && <strong>Why it fits: </strong>}
              {job.fitReason}
            </div>
          )}
        </div>
        <div className="card-actions">
          {job.applyUrl && (
            <a className="btn btn-apply" href={job.applyUrl} target="_blank" rel="noreferrer" onClick={handleApply}>
              Apply →
            </a>
          )}
          <button className="btn btn-secondary" onClick={() => setOpen(v => !v)}>
            {open ? "Less" : "More"}
          </button>
        </div>
      </div>

      {open && (
        <div className="card-detail">
          {job.summary ? (
            <p className="detail-text">{job.summary}</p>
          ) : (
            <div className="detail-text empty">No description available · click Apply for full posting</div>
          )}
          {job.keyMatch?.length > 0 && (
            <div className="detail-section">
              <div className="detail-label">{isExpanded ? "Skill Matches" : "Why You Match"}</div>
              <div>
                {job.keyMatch.map((m, i) => <span key={i} className="skill-tag">{m}</span>)}
              </div>
            </div>
          )}
          {isExpanded && job.missingSkills?.length > 0 && (
            <div className="detail-section">
              <div className="detail-label warn">⚠ Possible Gaps</div>
              <div>
                {job.missingSkills.map((m, i) => <span key={i} className="skill-tag warn">{m}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// === INTERESTED TAB CARD - decision queue ===
function InterestedCard({ entry, onConfirmApplied, onDecline, onUndo }) {
  const cls = `job-card fit-${entry.fit || "MED"} interested-card`;
  const opened = formatRelative(entry.dateInterested);

  return (
    <div className={cls}>
      <div className="card-body">
        <div className="card-main">
          <div className="badge-row">
            <span className="badge badge-interested">⏳ INTERESTED</span>
            <span className="badge badge-fit">{entry.fit}</span>
            {entry.expandedCategory && (
              <span className="badge badge-cat">{CATEGORY_LABELS[entry.expandedCategory]}</span>
            )}
            <span className="badge-platform">opened {opened}</span>
          </div>
          <div className="job-title">{entry.title}</div>
          <div className="job-meta">{entry.company}{entry.location ? ` · ${entry.location}` : ""}</div>
          <div className="match-row">
            {entry.matchScore && <MatchScore score={entry.matchScore} />}
            {entry.salary && <span className="salary">💰 {entry.salary}</span>}
          </div>
          <div className="fit-reason prompt">Did you actually apply? Pick below.</div>
        </div>
        <div className="card-actions">
          <button className="btn btn-confirm" onClick={() => onConfirmApplied(entry)}>✓ Yes I Applied</button>
          <button className="btn btn-decline" onClick={() => onDecline(entry)}>Not for me</button>
          {entry.applyUrl && (
            <a className="btn btn-secondary" href={entry.applyUrl} target="_blank" rel="noreferrer">View Posting →</a>
          )}
          <button className="btn btn-secondary" onClick={() => onUndo(entry.id)}>↶ Undo</button>
        </div>
      </div>
    </div>
  );
}

// === APPLIED TAB CARD - log entry ===
function AppliedCard({ entry, onUndo }) {
  return (
    <div className={`job-card fit-${entry.fit || "MED"} applied-card`}>
      <div className="card-body">
        <div className="card-main">
          <div className="badge-row">
            <span className="badge badge-fit">{entry.fit}</span>
            {entry.expandedCategory && (
              <span className="badge badge-cat">{CATEGORY_LABELS[entry.expandedCategory]}</span>
            )}
            <span className="badge-applied-tag">✓ APPLIED</span>
            {entry.dateApplied && <span className="badge-platform">{entry.dateApplied}</span>}
          </div>
          <div className="job-title">{entry.title}</div>
          <div className="job-meta">{entry.company}{entry.location ? ` · ${entry.location}` : ""}</div>
          {entry.salary && (
            <div className="match-row">
              <span className="salary">💰 {entry.salary}</span>
            </div>
          )}
        </div>
        <div className="card-actions">
          {entry.applyUrl && (
            <a className="btn btn-secondary" href={entry.applyUrl} target="_blank" rel="noreferrer">View Posting</a>
          )}
          <button className="btn btn-secondary" onClick={() => onUndo(entry.id)}>↶ Undo</button>
        </div>
      </div>
    </div>
  );
}

// === HIDDEN TAB CARD ===
function HiddenCard({ entry, onUndo }) {
  return (
    <div className={`job-card fit-${entry.fit || "MED"} hidden-card`}>
      <div className="card-body">
        <div className="card-main">
          <div className="badge-row">
            <span className="badge badge-fit">{entry.fit}</span>
            {entry.expandedCategory && (
              <span className="badge badge-cat">{CATEGORY_LABELS[entry.expandedCategory]}</span>
            )}
            <span className="badge-declined-tag">✗ NOT INTERESTED</span>
            {entry.dateHidden && <span className="badge-platform">{entry.dateHidden}</span>}
          </div>
          <div className="job-title">{entry.title}</div>
          <div className="job-meta">{entry.company}{entry.location ? ` · ${entry.location}` : ""}</div>
        </div>
        <div className="card-actions">
          <button className="btn btn-secondary" onClick={() => onUndo(entry.id)}>↶ Restore</button>
        </div>
      </div>
    </div>
  );
}

// === SETTINGS ===
function SettingsPanel({ open, onClose, prefs, onSave }) {
  const [draft, setDraft] = useState(prefs);
  useEffect(() => { setDraft(prefs); }, [prefs, open]);
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div>
            <div className="modal-title">Preferences</div>
            <div className="modal-sub">Saved to this browser</div>
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label className="form-label">Minimum Salary</label>
          <input type="range" min="40" max="250" step="10" value={draft.minSalary}
            onChange={e => setDraft({ ...draft, minSalary: parseInt(e.target.value) })} />
          <div className="salary-display">${draft.minSalary}k+</div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <label className="form-label">Work Type</label>
          <div className="pill-group">
            {[["all", "All"], ["onsite", "On-site"], ["hybrid", "Hybrid"], ["remote", "Remote"]].map(([val, label]) => (
              <button key={val} className={`pill ${draft.workType === val ? "active" : ""}`}
                onClick={() => setDraft({ ...draft, workType: val })}>{label}</button>
            ))}
          </div>
        </div>

        <button className="btn btn-apply" style={{ width: "100%", padding: "13px 0", fontSize: 13, letterSpacing: "0.05em" }}
          onClick={() => { onSave(draft); onClose(); }}>
          SAVE PREFERENCES
        </button>
      </div>
    </div>
  );
}

// ========== MAIN APP ==========
export default function App() {
  const [lane, setLane] = useState("wm");
  const [tab, setTab] = useState("active");
  const [data, setData] = useState({ wm: [], expanded: [] });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [applied, setApplied] = useState(() => loadStorage(STORAGE.applied, {}));
  const [interested, setInterested] = useState(() => loadStorage(STORAGE.interested, {}));
  const [hidden, setHidden] = useState(() => loadStorage(STORAGE.hidden, {}));
  const [viewed, setViewed] = useState(() => loadStorage(STORAGE.viewed, {}));
  const [prefs, setPrefs] = useState(() => loadStorage(STORAGE.prefs, DEFAULT_PREFS));

  const fetchJobs = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/jobs?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      if (d.jobs && !d.wm) setData({ wm: d.jobs, expanded: [] });
      else setData({ wm: d.wm || [], expanded: d.expanded || [] });
      setLastUpdated(d.lastUpdated);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // === ACTIONS ===
  // Click Apply on a New card → auto-route to Interested
  const routeToInterested = (job) => {
    if (interested[job.id] || applied[job.id]) return; // already routed/applied
    const next = { ...interested };
    next[job.id] = snapshotJob(job, { dateInterested: new Date().toISOString() });
    setInterested(next); saveStorage(STORAGE.interested, next);
  };

  // Confirm: from Interested → Applied
  const confirmApplied = (entry) => {
    const nextInterested = { ...interested }; delete nextInterested[entry.id];
    const nextApplied = { ...applied };
    nextApplied[entry.id] = { ...entry, dateApplied: new Date().toLocaleDateString() };
    setInterested(nextInterested); saveStorage(STORAGE.interested, nextInterested);
    setApplied(nextApplied); saveStorage(STORAGE.applied, nextApplied);
  };

  // Decline: from Interested → Hidden
  const declineFromInterested = (entry) => {
    const nextInterested = { ...interested }; delete nextInterested[entry.id];
    const nextHidden = { ...hidden };
    nextHidden[entry.id] = { ...entry, dateHidden: new Date().toLocaleDateString() };
    setInterested(nextInterested); saveStorage(STORAGE.interested, nextInterested);
    setHidden(nextHidden); saveStorage(STORAGE.hidden, nextHidden);
  };

  // Undo from Interested → back to active feed
  const undoInterested = (id) => {
    const n = { ...interested }; delete n[id];
    setInterested(n); saveStorage(STORAGE.interested, n);
  };
  // Undo from Applied → back to active feed
  const undoApplied = (id) => {
    const n = { ...applied }; delete n[id];
    setApplied(n); saveStorage(STORAGE.applied, n);
  };
  // Restore from Hidden → back to active feed
  const undoHidden = (id) => {
    const n = { ...hidden }; delete n[id];
    setHidden(n); saveStorage(STORAGE.hidden, n);
  };

  const markViewed = (job) => {
    if (viewed[job.id]) return;
    const n = { ...viewed, [job.id]: new Date().toISOString() };
    setViewed(n); saveStorage(STORAGE.viewed, n);
  };
  const savePrefs = (p) => { setPrefs(p); saveStorage(STORAGE.prefs, p); };

  // === FILTERS ===
  const meetsSalary = (job) => {
    if (!job.salary) return true;
    const m = job.salary.match(/\$?(\d+)k/i);
    if (!m) return true;
    return parseInt(m[1]) >= prefs.minSalary;
  };
  const meetsWorkType = (job) => {
    if (prefs.workType === "all") return true;
    const text = `${(job.location || "").toLowerCase()} ${(job.summary || "").toLowerCase()}`;
    if (prefs.workType === "remote") return /\bremote\b/.test(text);
    if (prefs.workType === "hybrid") return /\bhybrid\b/.test(text);
    if (prefs.workType === "onsite") return !/\b(remote|hybrid)\b/.test(text);
    return true;
  };

  const laneJobs = data[lane] || [];

  // Active feed: not in any of the three log states
  const activeFeed = useMemo(() => {
    return laneJobs
      .filter(j => !applied[j.id] && !interested[j.id] && !hidden[j.id])
      .filter(meetsSalary).filter(meetsWorkType)
      .filter(j => categoryFilter === "ALL" || j.expandedCategory === categoryFilter)
      .map(j => ({ ...j, _status: getJobStatus(j, viewed) }))
      .sort((a, b) => {
        const aV = a._status === "viewed", bV = b._status === "viewed";
        if (aV !== bV) return aV ? 1 : -1;
        if (a._status !== b._status) return a._status === "new" ? -1 : 1;
        return (b.matchScore || 0) - (a.matchScore || 0);
      });
  }, [laneJobs, applied, interested, hidden, viewed, prefs, categoryFilter]);

  const fitFiltered = filter === "ALL" ? activeFeed : activeFeed.filter(j => j.fit === filter);

  const counts = {
    HIGH: activeFeed.filter(j => j.fit === "HIGH").length,
    MED: activeFeed.filter(j => j.fit === "MED").length,
    LOW: activeFeed.filter(j => j.fit === "LOW").length,
    new: activeFeed.filter(j => j._status === "new").length,
  };

  // Lane-scoped lists
  const interestedList = Object.values(interested)
    .filter(e => (e.lane || "wm") === lane)
    .sort((a, b) => new Date(b.dateInterested) - new Date(a.dateInterested));
  const appliedList = Object.values(applied)
    .filter(e => (e.lane || "wm") === lane)
    .sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied));
  const hiddenList = Object.values(hidden)
    .filter(e => (e.lane || "wm") === lane)
    .sort((a, b) => new Date(b.dateHidden) - new Date(a.dateHidden));

  const totalApplied = Object.keys(applied).length;
  const totalInterested = Object.keys(interested).length;

  const categoryOptions = lane === "expanded" ? [
    ["ALL", activeFeed.length],
    ...Object.entries(CATEGORY_LABELS).map(([key]) =>
      [key, laneJobs.filter(j => j.expandedCategory === key && !applied[j.id] && !interested[j.id] && !hidden[j.id]).length])
  ] : null;

  return (
    <>
      <style>{CSS}</style>
      <div className="forest-bg" />
      <div className="botanical-overlay" />
      <div className="grain" />

      <div className="header">
        <div>
          <div className="brand-name">Job Radar</div>
          <div className="brand-sub">{data.wm.length + data.expanded.length} listings · {totalInterested} interested · {totalApplied} applied</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Settings">⚙</button>
          <button className="btn-refresh" onClick={fetchJobs} disabled={loading}>
            {loading ? <><span className="spinner small" /> LOADING</> : "↻ REFRESH"}
          </button>
        </div>
      </div>

      <div className="lane-toggle-wrap">
        <div className="lane-toggle">
          <button className={`lane-btn ${lane === "wm" ? "active" : ""}`}
            onClick={() => { setLane("wm"); setFilter("ALL"); setCategoryFilter("ALL"); setTab("active"); }}>
            Wealth Management
            <span className="lane-count">{data.wm.length}</span>
          </button>
          <button className={`lane-btn ${lane === "expanded" ? "active expanded" : ""}`}
            onClick={() => { setLane("expanded"); setFilter("ALL"); setCategoryFilter("ALL"); setTab("active"); }}>
            Expanded
            <span className="lane-count">{data.expanded.length}</span>
          </button>
        </div>
      </div>

      <div className="tabs-wrap">
        {[
          ["active", "New", activeFeed.length, ""],
          ["interested", "Interested", interestedList.length, "amber"],
          ["applied", "Applied", appliedList.length, ""],
          ["hidden", "Not Interested", hiddenList.length, "red"],
        ].map(([id, label, n, cls]) => (
          <button key={id} className={`tab ${tab === id ? `active ${cls}` : ""}`} onClick={() => setTab(id)}>
            {label} <span className="tab-count">{n}</span>
          </button>
        ))}
      </div>

      <div className="content">
        {lastUpdated && (
          <div className="status-line">
            <span className={`pulse-dot ${lane === "expanded" ? "expanded" : ""}`} />
            <span className="status-text">{new Date(lastUpdated).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
            {counts.new > 0 && tab === "active" && <span className="status-text">· {counts.new} new today</span>}
            <span className="status-meta">· auto-refreshes 8 AM & 4 PM</span>
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(239, 154, 154, 0.08)", border: "1px solid rgba(239, 154, 154, 0.3)", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ color: "#ef9a9a", fontWeight: 700, marginBottom: 4 }}>Failed to load listings</div>
            <div style={{ color: "#ef9a9a", fontSize: 12, marginBottom: 10, opacity: 0.8 }}>{error}</div>
            <button className="btn btn-secondary" onClick={fetchJobs}>Retry</button>
          </div>
        )}

        {/* === ACTIVE / NEW TAB === */}
        {tab === "active" && (
          <>
            {lane === "expanded" && categoryOptions && (
              <div className="chip-row">
                {categoryOptions.map(([key, n]) => (
                  <button key={key} className={`cat-chip ${categoryFilter === key ? "active" : ""}`}
                    onClick={() => setCategoryFilter(key)}>
                    {key === "ALL" ? `All ${n}` : `${CATEGORY_LABELS[key]} ${n}`}
                  </button>
                ))}
              </div>
            )}

            {laneJobs.length > 0 && (
              <div className="chip-row">
                {[["ALL", activeFeed.length], ["HIGH", counts.HIGH], ["MED", counts.MED], ["LOW", counts.LOW]].map(([f, n]) => (
                  <button key={f} className={`chip ${f.toLowerCase()} ${filter === f ? "active" : ""}`}
                    onClick={() => setFilter(f)}>{f} {n}</button>
                ))}
              </div>
            )}

            {loading && data.wm.length === 0 && data.expanded.length === 0 && (
              <div className="empty-state">
                <div className="spinner" style={{ marginBottom: 16 }} />
                <div className="empty-text">Loading both lanes...</div>
              </div>
            )}

            {!loading && fitFiltered.length === 0 && laneJobs.length > 0 && (
              <div className="empty-state">
                <div className="empty-text">No matching listings.</div>
                <div className="empty-sub">Try adjusting your preferences (⚙ top right)</div>
              </div>
            )}

            {!loading && laneJobs.length === 0 && lane === "expanded" && (
              <div className="empty-state">
                <div className="empty-text">No expanded opportunities yet.</div>
                <div className="empty-sub">Next scan runs at 8 AM. Click REFRESH for fresh listings now.</div>
              </div>
            )}

            {fitFiltered.map(job => (
              <NewCard key={job.id} job={job} status={job._status}
                onApplyClick={routeToInterested} onView={markViewed} />
            ))}
          </>
        )}

        {/* === INTERESTED TAB === */}
        {tab === "interested" && (
          interestedList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-text">No jobs in your decision queue.</div>
              <div className="empty-sub">Click <strong>Apply →</strong> on any New listing to add it here.</div>
            </div>
          ) : (
            <>
              <div className="section-note">
                <strong>Decision queue.</strong> These are jobs you opened to apply to. Mark <em>Yes I Applied</em> to log it, or <em>Not for me</em> if you decided to skip.
              </div>
              {interestedList.map(entry => (
                <InterestedCard key={entry.id} entry={entry}
                  onConfirmApplied={confirmApplied} onDecline={declineFromInterested} onUndo={undoInterested} />
              ))}
            </>
          )
        )}

        {/* === APPLIED TAB === */}
        {tab === "applied" && (
          appliedList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-text">No {lane === "expanded" ? "Expanded" : "WM"} applications tracked yet.</div>
            </div>
          ) : (
            <>
              <div className="detail-label" style={{ fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>
                {appliedList.length} application{appliedList.length !== 1 ? "s" : ""}
              </div>
              {appliedList.map(entry => (
                <AppliedCard key={entry.id} entry={entry} onUndo={undoApplied} />
              ))}
            </>
          )
        )}

        {/* === NOT INTERESTED TAB === */}
        {tab === "hidden" && (
          hiddenList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-text">Nothing marked Not Interested in this lane.</div>
            </div>
          ) : (
            <>
              <div className="detail-label" style={{ fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>
                {hiddenList.length} hidden
              </div>
              {hiddenList.map(entry => (
                <HiddenCard key={entry.id} entry={entry} onUndo={undoHidden} />
              ))}
            </>
          )
        )}
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} prefs={prefs} onSave={savePrefs} />
    </>
  );
}
