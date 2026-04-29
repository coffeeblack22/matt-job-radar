import { useState, useEffect, useCallback, useMemo } from "react";

// ========== STORAGE ==========
const STORAGE = {
  applied: "matt_jobs_applied_v2",
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

// ========== ALL CSS IN ONE BLOCK ==========
const CSS = `
  *, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin: 0; padding: 0; background: #050d08; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #e8efe6;
    overflow-x: hidden;
    min-height: 100vh;
    min-height: 100dvh;
  }

  /* Forest ambient background */
  .forest-bg {
    position: fixed; inset: 0; z-index: -2;
    background:
      radial-gradient(ellipse 80% 50% at 20% 10%, rgba(34, 87, 47, 0.4) 0%, transparent 60%),
      radial-gradient(ellipse 70% 60% at 80% 80%, rgba(20, 65, 38, 0.5) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 50% 100%, rgba(15, 55, 30, 0.6) 0%, transparent 70%),
      linear-gradient(180deg, #050d08 0%, #0a1f12 50%, #061309 100%);
  }
  .botanical-overlay {
    position: fixed; inset: 0; z-index: -1; pointer-events: none; opacity: 0.18;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'><defs><filter id='blur'><feGaussianBlur stdDeviation='3'/></filter></defs><g fill='%2334a853' filter='url(%23blur)'><path d='M50 400 Q 80 350 100 380 Q 120 360 110 410 Q 90 430 60 420 Q 40 410 50 400 Z' opacity='0.4'/><path d='M700 200 Q 730 150 760 180 Q 770 210 740 230 Q 710 220 700 200 Z' opacity='0.3'/><path d='M150 700 Q 200 650 240 680 Q 250 720 200 740 Q 160 730 150 700 Z' opacity='0.35'/><path d='M650 600 Q 690 570 710 590 Q 720 620 690 640 Q 660 630 650 600 Z' opacity='0.3'/><circle cx='400' cy='100' r='3' opacity='0.5'/><circle cx='500' cy='300' r='2' opacity='0.4'/><circle cx='200' cy='250' r='2' opacity='0.4'/><circle cx='600' cy='450' r='2.5' opacity='0.35'/><circle cx='350' cy='550' r='2' opacity='0.4'/></g></svg>");
    background-size: 100% 100%;
  }
  .grain {
    position: fixed; inset: 0; z-index: -1; pointer-events: none; opacity: 0.04;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  }

  /* Header - frosted glass top bar */
  .header {
    position: sticky; top: 0; z-index: 50;
    padding: max(14px, env(safe-area-inset-top)) 18px 14px;
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    background: rgba(8, 22, 14, 0.65);
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    border-bottom: 1px solid rgba(120, 200, 130, 0.08);
  }
  .brand-name {
    font-family: 'Fraunces', serif;
    font-size: 19px; font-weight: 600; letter-spacing: -0.02em;
    color: #f0f7ee;
  }
  .brand-sub {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px; color: #6e9077; margin-top: 2px; letter-spacing: 0.04em;
  }
  .icon-btn {
    width: 40px; height: 40px; border-radius: 14px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(20px);
    color: #b8d4bd; font-size: 17px;
    cursor: pointer; transition: all 0.2s;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .icon-btn:hover, .icon-btn:active {
    background: rgba(255,255,255,0.1); transform: scale(0.96);
  }
  .btn-refresh {
    background: linear-gradient(180deg, rgba(120, 220, 160, 0.18) 0%, rgba(80, 180, 120, 0.1) 100%);
    border: 1px solid rgba(120, 220, 160, 0.3);
    color: #b9e8c9;
    padding: 8px 14px; border-radius: 12px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
    display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 14px rgba(108, 211, 151, 0.15);
    transition: all 0.2s;
    font-family: inherit; white-space: nowrap;
  }
  .btn-refresh:hover { transform: translateY(-1px); }
  .btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  /* Lane toggle - glass pill */
  .lane-toggle-wrap {
    max-width: 820px; margin: 0 auto;
    padding: 16px 16px 0;
  }
  .lane-toggle {
    background: rgba(8, 22, 14, 0.5);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 18px;
    padding: 5px;
    display: flex; gap: 4px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
  }
  .lane-btn {
    flex: 1; padding: 11px 14px;
    background: transparent; border: 1px solid transparent;
    color: #88a890; font-size: 12.5px; font-weight: 600;
    border-radius: 13px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 7px;
    transition: all 0.25s cubic-bezier(0.4, 0.0, 0.2, 1);
    font-family: inherit;
  }
  .lane-btn.active {
    background: linear-gradient(180deg, rgba(82, 175, 109, 0.25) 0%, rgba(60, 140, 88, 0.18) 100%);
    color: #e8f5ec;
    box-shadow: 0 2px 8px rgba(82, 175, 109, 0.2), inset 0 1px 0 rgba(255,255,255,0.12);
    border: 1px solid rgba(120, 200, 140, 0.25);
  }
  .lane-btn.active.expanded {
    background: linear-gradient(180deg, rgba(168, 130, 230, 0.25) 0%, rgba(140, 100, 200, 0.18) 100%);
    box-shadow: 0 2px 8px rgba(168, 130, 230, 0.2), inset 0 1px 0 rgba(255,255,255,0.12);
    border-color: rgba(180, 140, 230, 0.3);
  }
  .lane-count {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px; padding: 1px 7px; border-radius: 8px;
    background: rgba(120, 200, 140, 0.18);
    color: #a8d4b3; font-weight: 700;
  }
  .lane-btn.active.expanded .lane-count {
    background: rgba(180, 140, 230, 0.18); color: #c9a8e8;
  }

  /* Tabs */
  .tabs-wrap {
    max-width: 820px; margin: 16px auto 0;
    padding: 0 16px;
    border-bottom: 1px solid rgba(120, 200, 140, 0.06);
    display: flex; gap: 4px;
  }
  .tab {
    flex: 1; padding: 11px 0 13px;
    background: transparent; border: none;
    color: #6e9077; font-size: 12px; font-weight: 500;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 7px;
    border-bottom: 2px solid transparent;
    transition: all 0.2s; font-family: inherit;
  }
  .tab.active { color: #f0f7ee; font-weight: 700; border-bottom-color: #6cd397; }
  .tab.active.expanded { border-bottom-color: #c9a8e8; }
  .tab.active.red { border-bottom-color: #e88c8c; }
  .tab-count {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9.5px; padding: 1px 6px; border-radius: 10px;
    background: rgba(255,255,255,0.05); color: #88a890; font-weight: 700;
  }
  .tab.active .tab-count { background: rgba(108, 211, 151, 0.2); color: #b9e8c9; }
  .tab.active.expanded .tab-count { background: rgba(201, 168, 232, 0.2); color: #d8c4ed; }
  .tab.active.red .tab-count { background: rgba(232, 140, 140, 0.2); color: #f0b0b0; }

  /* Content area */
  .content { max-width: 820px; margin: 0 auto; padding: 16px 16px 100px; }

  /* Status row */
  .status-line { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .pulse-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #6cd397; box-shadow: 0 0 10px #6cd397, 0 0 20px rgba(108, 211, 151, 0.4);
    animation: pulse 2s ease-in-out infinite;
  }
  .pulse-dot.expanded { background: #c9a8e8; box-shadow: 0 0 10px #c9a8e8, 0 0 20px rgba(201, 168, 232, 0.4); }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(0.85); }
  }
  .status-text { color: #b9e8c9; font-size: 11px; font-family: 'JetBrains Mono', monospace; }
  .status-text.expanded { color: #d8c4ed; }
  .status-meta { color: #6e9077; font-size: 11px; }

  /* Filter chips */
  .chip-row { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
  .chip {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.08);
    color: #88a890; font-size: 10.5px; font-weight: 700;
    padding: 5px 12px; border-radius: 8px;
    cursor: pointer; font-family: 'JetBrains Mono', monospace;
    transition: all 0.2s;
  }
  .chip:hover { background: rgba(255,255,255,0.04); }
  .chip.active { background: rgba(255,255,255,0.06); border-color: rgba(120, 200, 140, 0.25); color: #f0f7ee; }
  .chip.high.active { color: #6cd397; border-color: rgba(108, 211, 151, 0.5); }
  .chip.med.active { color: #f3c970; border-color: rgba(243, 201, 112, 0.5); }
  .chip.low.active { color: #e88c8c; border-color: rgba(232, 140, 140, 0.5); }

  .cat-chip {
    background: transparent; border: 1px solid rgba(255,255,255,0.08);
    color: #88a890; font-size: 11px; font-weight: 600;
    padding: 5px 11px; border-radius: 10px; cursor: pointer;
    transition: all 0.2s; font-family: inherit;
  }
  .cat-chip:hover { background: rgba(255,255,255,0.04); }
  .cat-chip.active {
    background: rgba(168, 130, 230, 0.15);
    border-color: rgba(180, 140, 230, 0.4);
    color: #d8c4ed;
  }

  /* Job cards - liquid glass */
  .job-card {
    margin-bottom: 14px;
    background: rgba(15, 30, 22, 0.55);
    backdrop-filter: blur(24px) saturate(170%);
    -webkit-backdrop-filter: blur(24px) saturate(170%);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 22px;
    overflow: hidden; position: relative;
    transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
    box-shadow: 0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05);
    animation: slideUp 0.4s cubic-bezier(0.4, 0.0, 0.2, 1) backwards;
  }
  .job-card::before {
    content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
    background: linear-gradient(180deg, var(--accent), transparent); opacity: 0.9;
  }
  .job-card:hover {
    transform: translateY(-2px);
    border-color: rgba(120, 200, 140, 0.2);
    box-shadow: 0 12px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08);
  }
  .job-card.fit-HIGH { --accent: #6cd397; --accent-soft: rgba(108, 211, 151, 0.12); }
  .job-card.fit-MED { --accent: #f3c970; --accent-soft: rgba(243, 201, 112, 0.12); }
  .job-card.fit-LOW { --accent: #e88c8c; --accent-soft: rgba(232, 140, 140, 0.12); }
  .job-card.applied {
    background: rgba(20, 50, 32, 0.55);
    border-color: rgba(108, 211, 151, 0.25);
  }
  .job-card.viewed { opacity: 0.78; }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .card-body { padding: 16px 18px; display: flex; gap: 12px; align-items: flex-start; }
  .card-main { flex: 1; min-width: 0; }
  .card-actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }

  .badge-row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; }
  .badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em;
    padding: 3px 8px; border-radius: 6px; border: 1px solid;
  }
  .badge-new { color: #6cd397; background: rgba(108, 211, 151, 0.12); border-color: rgba(108, 211, 151, 0.3); }
  .badge-updated { color: #88c5e8; background: rgba(136, 197, 232, 0.1); border-color: rgba(136, 197, 232, 0.25); }
  .badge-viewed { color: #6e9077; background: transparent; border-color: rgba(110, 144, 119, 0.3); }
  .badge-fit { color: var(--accent); background: var(--accent-soft); border-color: rgba(255,255,255,0.1); font-weight: 800; }
  .badge-cat {
    color: #c9a8e8; background: rgba(180, 130, 230, 0.12);
    border-color: rgba(180, 130, 230, 0.25);
    font-family: 'Inter', sans-serif; font-size: 10px;
    letter-spacing: 0.02em; font-weight: 600; text-transform: none;
  }
  .badge-platform { font-family: 'JetBrains Mono', monospace; font-size: 9.5px; color: #5a7a63; padding: 0; }
  .badge-applied { font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; color: #6cd397; }

  .job-title {
    font-family: 'Fraunces', serif;
    font-size: 16px; font-weight: 600; letter-spacing: -0.015em;
    color: #f0f7ee; line-height: 1.3; margin-bottom: 4px;
  }
  .job-meta { font-size: 12.5px; color: #88a890; margin-bottom: 10px; }

  .match-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
  .match-capsule {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px; border-radius: 10px;
    background: linear-gradient(135deg, rgba(108, 211, 151, 0.15) 0%, rgba(108, 211, 151, 0.06) 100%);
    border: 1px solid rgba(108, 211, 151, 0.3);
  }
  .match-capsule .pct { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 800; color: #6cd397; }
  .match-capsule .label { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; color: #88a890; }
  .match-capsule.med {
    background: linear-gradient(135deg, rgba(243, 201, 112, 0.15) 0%, rgba(243, 201, 112, 0.06) 100%);
    border-color: rgba(243, 201, 112, 0.3);
  }
  .match-capsule.med .pct { color: #f3c970; }
  .match-capsule.low {
    background: linear-gradient(135deg, rgba(232, 140, 140, 0.15) 0%, rgba(232, 140, 140, 0.06) 100%);
    border-color: rgba(232, 140, 140, 0.3);
  }
  .match-capsule.low .pct { color: #e88c8c; }

  .salary { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600; color: var(--accent); }

  .fit-reason { color: #6e9077; font-size: 11.5px; line-height: 1.5; font-style: italic; }
  .fit-reason.expanded { color: #c9a8e8; font-style: normal; font-weight: 500; }
  .fit-reason.expanded strong { color: #d8c4ed; font-weight: 700; }

  .btn {
    padding: 7px 14px; border-radius: 11px;
    font-size: 11.5px; font-weight: 600; cursor: pointer; white-space: nowrap;
    transition: all 0.2s; text-decoration: none; text-align: center;
    font-family: inherit; border: 1px solid; display: inline-block;
  }
  .btn-apply {
    background: linear-gradient(180deg, rgba(108, 211, 151, 0.2) 0%, rgba(70, 175, 110, 0.1) 100%);
    border-color: rgba(108, 211, 151, 0.4); color: #6cd397;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 6px rgba(108, 211, 151, 0.15);
  }
  .btn-apply:hover { transform: translateY(-1px); }
  .btn-secondary { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); color: #88a890; }
  .btn-secondary:hover { background: rgba(255,255,255,0.07); color: #b8d4bd; }
  .btn-applied { background: rgba(108, 211, 151, 0.15); border-color: rgba(108, 211, 151, 0.4); color: #6cd397; }
  .btn-danger {
    background: transparent; border-color: rgba(232, 140, 140, 0.4);
    color: #e88c8c; opacity: 0.85;
  }

  /* Expanded card detail panel */
  .card-detail {
    border-top: 1px solid rgba(255,255,255,0.06);
    padding: 16px 18px;
    background: rgba(0,0,0,0.15);
  }
  .detail-text { color: #b8d4bd; font-size: 13px; line-height: 1.7; margin-bottom: 14px; }
  .detail-text.empty { color: #5a7a63; font-style: italic; font-size: 12px; }
  .detail-section { margin-bottom: 14px; }
  .detail-label {
    color: #6e9077; font-size: 9px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 7px;
  }
  .detail-label.warn { color: #f3c970; }
  .skill-tag {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    color: #88a890;
    border-radius: 6px; padding: 3px 9px; font-size: 11px;
    display: inline-block; margin: 0 6px 6px 0;
  }
  .skill-tag.warn {
    background: rgba(243, 201, 112, 0.08);
    border-color: rgba(243, 201, 112, 0.3);
    color: #f3c970;
  }

  /* Empty state */
  .empty-state { text-align: center; padding: 80px 16px; }
  .empty-text { color: #6e9077; font-size: 13px; margin-bottom: 6px; }
  .empty-sub { color: #5a7a63; font-size: 11px; opacity: 0.7; }

  /* Spinner */
  .spinner {
    width: 22px; height: 22px;
    border: 2px solid rgba(255,255,255,0.1);
    border-top-color: #6cd397; border-radius: 50%;
    animation: spin 0.8s linear infinite;
    display: inline-block;
  }
  .spinner.small { width: 9px; height: 9px; border-width: 2px; vertical-align: middle; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* History row (applied/hidden lists) */
  .history-row {
    background: rgba(15, 30, 22, 0.55);
    backdrop-filter: blur(24px) saturate(170%);
    border: 1px solid rgba(255,255,255,0.06);
    border-left: 3px solid var(--accent);
    border-radius: 14px;
    padding: 13px 15px; margin-bottom: 9px;
    display: flex; align-items: center; gap: 12px;
  }
  .history-row.green { --accent: #6cd397; }
  .history-row.red { --accent: #e88c8c; }
  .history-main { flex: 1; min-width: 0; }
  .history-meta { color: #88a890; font-size: 11.5px; }

  /* Settings modal */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.7);
    backdrop-filter: blur(8px); z-index: 100;
    display: flex; align-items: center; justify-content: center; padding: 16px;
    animation: fadeIn 0.2s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal-panel {
    background: rgba(8, 22, 14, 0.95);
    backdrop-filter: blur(40px) saturate(180%);
    border: 1px solid rgba(120, 200, 140, 0.15);
    border-radius: 24px; padding: 24px;
    max-width: 440px; width: 100%;
    box-shadow: 0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08);
    animation: slideUp 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
  }
  .modal-title { font-family: 'Fraunces', serif; color: #f0f7ee; font-size: 18px; font-weight: 600; }
  .modal-sub { color: #6e9077; font-size: 11.5px; margin-top: 2px; }
  .form-label {
    display: block; color: #88a890; font-size: 11px; font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px;
  }
  .salary-display {
    color: #f0f7ee; font-size: 22px; font-weight: 700; margin-top: 6px;
    font-family: 'JetBrains Mono', monospace;
  }
  .pill-group { display: flex; gap: 6px; flex-wrap: wrap; }
  .pill {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.1);
    color: #88a890;
    border-radius: 11px; padding: 8px 16px; font-size: 12px; font-weight: 600;
    cursor: pointer; font-family: inherit; transition: all 0.2s;
  }
  .pill:hover { background: rgba(255,255,255,0.04); }
  .pill.active {
    background: rgba(108, 211, 151, 0.15);
    border-color: rgba(108, 211, 151, 0.4);
    color: #6cd397;
  }
  input[type="range"] {
    width: 100%; accent-color: #6cd397;
  }

  /* Mobile tweaks */
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

function JobCard({ job, isApplied, isHidden, status, onApply, onHide, onUnhide, onView }) {
  const [open, setOpen] = useState(false);
  const isExpanded = job.lane === "expanded";

  const cls = `job-card fit-${job.fit || "MED"}${isApplied ? " applied" : ""}${status === "viewed" ? " viewed" : ""}`;

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
            <span className="badge-platform">{job.platform}</span>
            <span className="badge-platform">· {job.posted}</span>
            {isApplied && <span className="badge-applied">✓ APPLIED</span>}
          </div>
          <div className="job-title">{job.title}</div>
          <div className="job-meta">
            {job.company}{job.location ? ` · ${job.location}` : ""}
          </div>
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
            <a className="btn btn-apply" href={job.applyUrl} target="_blank" rel="noreferrer" onClick={() => onView(job)}>
              Apply →
            </a>
          )}
          {!isHidden && (
            <button className={`btn ${isApplied ? "btn-applied" : "btn-secondary"}`} onClick={() => onApply(job)}>
              {isApplied ? "Applied ✓" : "Mark Applied"}
            </button>
          )}
          {isHidden ? (
            <button className="btn btn-secondary" onClick={() => onUnhide(job)}>↶ Restore</button>
          ) : (
            <button className="btn btn-secondary" onClick={() => setOpen(v => !v)}>
              {open ? "Less" : "More"}
            </button>
          )}
        </div>
      </div>

      {open && !isHidden && (
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
          <button className="btn btn-danger" onClick={() => onHide(job)}>Not Interested</button>
        </div>
      )}
    </div>
  );
}

function HistoryRow({ entry, onAction, color, dateLabel }) {
  return (
    <div className={`history-row ${color}`}>
      <div className="history-main">
        <div className="badge-row" style={{ marginBottom: 4 }}>
          <span className="badge badge-fit" style={{ "--accent": color === "green" ? "#6cd397" : "#e88c8c" }}>{entry.fit}</span>
          {entry.expandedCategory && <span className="badge badge-cat">{CATEGORY_LABELS[entry.expandedCategory]}</span>}
          <span className={color === "green" ? "badge-applied" : "badge-applied"} style={{ color: color === "green" ? "#6cd397" : "#e88c8c" }}>
            {color === "green" ? "✓ APPLIED" : "✗ NOT INTERESTED"}
          </span>
          {dateLabel && <span className="badge-platform">{dateLabel}</span>}
        </div>
        <div className="job-title" style={{ fontSize: 14, marginBottom: 2 }}>{entry.title}</div>
        <div className="history-meta">{entry.company}{entry.location ? ` · ${entry.location}` : ""}</div>
        {entry.salary && <div style={{ color: "#6cd397", fontSize: 10, marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>{entry.salary}</div>}
      </div>
      {entry.applyUrl && (
        <a className="btn btn-secondary" href={entry.applyUrl} target="_blank" rel="noreferrer">View</a>
      )}
      <button className="btn btn-secondary" onClick={() => onAction(entry.id)}>↶</button>
    </div>
  );
}

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

  const markApplied = (job) => {
    const next = { ...applied };
    if (next[job.id]) delete next[job.id];
    else next[job.id] = {
      id: job.id, title: job.title, company: job.company, location: job.location,
      fit: job.fit, applyUrl: job.applyUrl, platform: job.platform, salary: job.salary,
      lane: job.lane, expandedCategory: job.expandedCategory,
      dateApplied: new Date().toLocaleDateString(),
    };
    setApplied(next); saveStorage(STORAGE.applied, next);
  };
  const unapply = (id) => { const n = { ...applied }; delete n[id]; setApplied(n); saveStorage(STORAGE.applied, n); };
  const hide = (job) => {
    const next = { ...hidden };
    next[job.id] = {
      id: job.id, title: job.title, company: job.company, location: job.location,
      fit: job.fit, applyUrl: job.applyUrl, platform: job.platform, salary: job.salary,
      lane: job.lane, expandedCategory: job.expandedCategory,
      dateHidden: new Date().toLocaleDateString(),
    };
    setHidden(next); saveStorage(STORAGE.hidden, next);
  };
  const unhide = (jobOrId) => {
    const id = typeof jobOrId === "string" ? jobOrId : jobOrId.id;
    const n = { ...hidden }; delete n[id]; setHidden(n); saveStorage(STORAGE.hidden, n);
  };
  const markViewed = (job) => {
    if (viewed[job.id]) return;
    const n = { ...viewed, [job.id]: new Date().toISOString() };
    setViewed(n); saveStorage(STORAGE.viewed, n);
  };
  const savePrefs = (p) => { setPrefs(p); saveStorage(STORAGE.prefs, p); };

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

  const activeFeed = useMemo(() => {
    return laneJobs
      .filter(j => !applied[j.id] && !hidden[j.id])
      .filter(meetsSalary).filter(meetsWorkType)
      .filter(j => categoryFilter === "ALL" || j.expandedCategory === categoryFilter)
      .map(j => ({ ...j, _status: getJobStatus(j, viewed) }))
      .sort((a, b) => {
        const aV = a._status === "viewed", bV = b._status === "viewed";
        if (aV !== bV) return aV ? 1 : -1;
        if (a._status !== b._status) return a._status === "new" ? -1 : 1;
        return (b.matchScore || 0) - (a.matchScore || 0);
      });
  }, [laneJobs, applied, hidden, viewed, prefs, categoryFilter]);

  const fitFiltered = filter === "ALL" ? activeFeed : activeFeed.filter(j => j.fit === filter);

  const counts = {
    HIGH: activeFeed.filter(j => j.fit === "HIGH").length,
    MED: activeFeed.filter(j => j.fit === "MED").length,
    LOW: activeFeed.filter(j => j.fit === "LOW").length,
    new: activeFeed.filter(j => j._status === "new").length,
  };

  const appliedList = Object.values(applied)
    .filter(e => (e.lane || "wm") === lane)
    .sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied));
  const hiddenList = Object.values(hidden)
    .filter(e => (e.lane || "wm") === lane)
    .sort((a, b) => new Date(b.dateHidden) - new Date(a.dateHidden));

  const totalApplied = Object.keys(applied).length;
  const totalViewed = Object.keys(viewed).length;

  const categoryOptions = lane === "expanded" ? [
    ["ALL", activeFeed.length],
    ...Object.entries(CATEGORY_LABELS).map(([key]) =>
      [key, laneJobs.filter(j => j.expandedCategory === key && !applied[j.id] && !hidden[j.id]).length])
  ] : null;

  const tabAccentCls = (id) => {
    if (id === "active") return lane === "expanded" ? "expanded" : "";
    if (id === "applied") return "";
    if (id === "hidden") return "red";
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="forest-bg" />
      <div className="botanical-overlay" />
      <div className="grain" />

      <div className="header">
        <div>
          <div className="brand-name">Job Radar</div>
          <div className="brand-sub">{data.wm.length + data.expanded.length} listings · {totalApplied} applied · {totalViewed} viewed</div>
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
          ["active", "New", activeFeed.length],
          ["applied", "Applied", appliedList.length],
          ["hidden", "Not Interested", hiddenList.length],
        ].map(([id, label, n]) => (
          <button key={id} className={`tab ${tab === id ? `active ${tabAccentCls(id)}` : ""}`}
            onClick={() => setTab(id)}>
            {label} <span className="tab-count">{n}</span>
          </button>
        ))}
      </div>

      <div className="content">
        {lastUpdated && (
          <div className="status-line">
            <span className={`pulse-dot ${lane === "expanded" ? "expanded" : ""}`} />
            <span className={`status-text ${lane === "expanded" ? "expanded" : ""}`}>
              {new Date(lastUpdated).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
            </span>
            {counts.new > 0 && tab === "active" && <span className="status-text">· {counts.new} new today</span>}
            <span className="status-meta">· auto-refreshes 8 AM & 4 PM</span>
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(232, 140, 140, 0.1)", border: "1px solid rgba(232, 140, 140, 0.3)", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ color: "#e88c8c", fontWeight: 700, marginBottom: 4 }}>Failed to load listings</div>
            <div style={{ color: "#e88c8c", fontSize: 12, marginBottom: 10, opacity: 0.8 }}>{error}</div>
            <button className="btn btn-secondary" onClick={fetchJobs}>Retry</button>
          </div>
        )}

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
                    onClick={() => setFilter(f)}>
                    {f} {n}
                  </button>
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
              <JobCard key={job.id} job={job}
                isApplied={!!applied[job.id]} isHidden={!!hidden[job.id]}
                status={job._status}
                onApply={markApplied} onHide={hide} onUnhide={unhide} onView={markViewed} />
            ))}
          </>
        )}

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
                <HistoryRow key={entry.id} entry={entry} onAction={unapply} color="green" dateLabel={entry.dateApplied} />
              ))}
            </>
          )
        )}

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
                <HistoryRow key={entry.id} entry={entry} onAction={unhide} color="red" dateLabel={entry.dateHidden} />
              ))}
            </>
          )
        )}
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} prefs={prefs} onSave={savePrefs} />
    </>
  );
}
