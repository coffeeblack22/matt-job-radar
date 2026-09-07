// netlify/functions/fetch-jobs.js
// v4 — HTTP on-demand. Adzuna + ATS boards (Greenhouse/Lever/Ashby) + AI scoring.


// === WM LANE searches ===
const WM_SEARCHES = [
  { query: "wealth management associate", location: "New York, NY" },
  { query: "registered client associate series 7", location: "New York, NY" },
  { query: "financial planning associate", location: "New York, NY" },
  { query: "private client advisor", location: "New York, NY" },
  { query: "equity compensation stock plan advisor", location: "New York, NY" },
  { query: "wealth management", location: "Remote" },
];

// === EXPANDED LANE searches ===
// Trimmed: "chief of staff", "founders associate", "business development
// financial services" and "strategic partnerships finance" were pulling roles
// with no connection to Matt's background (Google Chief of Staff, Brex
// enterprise sales, fraud ops). Removed for speed and signal.
const EXPANDED_SEARCHES = [
  { query: "investor relations associate", location: "New York, NY" },
  { query: "compliance analyst finance", location: "New York, NY" },
  { query: "customer success fintech", location: "New York, NY" },
  { query: "implementation manager wealth", location: "New York, NY" },
  { query: "client solutions wealth management", location: "New York, NY" },
  { query: "equity compensation stock plan", location: "New York, NY" },
  { query: "customer success wealth management", location: "Remote" },
];

// === WM keywords ===
const WM_KEYWORDS_HIGH = [
  "series 7", "series 66", "wealth management", "financial planning",
  "financial advisor", "financial planner", "wealth advisor",
  "client associate", "private wealth", "financial planning specialist"
];
const WM_KEYWORDS_MED = [
  "fintech", "registered representative", "investment advisor",
  "client services", "equity compensation", "rsu", "stock options",
  "insurance", "client success", "relationship manager"
];

// === EXPANDED categories ===
const EXPANDED_CATEGORIES = {
  finance_adjacent: {
    label: "Finance Adjacent",
    terms: [
      "commercial banking", "treasury analyst", "treasury operations", "treasury associate",
      "investor relations",
      "business development", "bizdev",
      "operations analyst", "operations associate",
      "compliance analyst", "compliance officer", "compliance associate",
      "credit analyst", "underwriter"
    ]
  },
  fintech_tech: {
    label: "Fintech / Tech",
    terms: [
      "customer success manager", "customer success",
      "account executive", "account manager",
      "product specialist", "implementation manager", "implementation specialist",
      "relationship manager", "ai operations", "ai finance",
      "saas account", "client success manager"
    ]
  },
  high_trust: {
    label: "High Trust / Growth",
    terms: [
      "chief of staff", "executive associate",
      "founder's associate", "founders associate", "founder associate",
      "strategic partnerships", "partnerships manager",
      "business operations"
    ]
  }
};

const KEYWORDS_NEGATIVE = [
  "trainee", "intern", "no experience", "we'll sponsor", "sponsor your licenses",
  "entry level no experience", "commission only", "100% commission",
  "trainee program", "career changer"
];

// === HARD FILTERS ===
const BLOCKED_COMPANIES = [
  "equitable advisors", "northwestern mutual", "new york life insurance"
];

// WM lane: NYC metro + remote (NJ blocked since you'd commute from Brooklyn)
const VALID_NY_LOCATION = /\b(new york|nyc|brooklyn|manhattan|queens|bronx|staten island|long island|westchester|yonkers|white plains|garden city|hempstead|mineola)\b/i;

// Expanded lane: NYC metro + NJ + remote (per spec)
const VALID_EXPANDED_LOCATION = /\b(new york|nyc|brooklyn|manhattan|queens|bronx|staten island|long island|westchester|yonkers|white plains|garden city|hempstead|mineola|jersey city|hoboken|newark|new jersey|nj)\b/i;

const REMOTE_LOCATION = /\bremote\b/i;
const NON_NY_STATES_WM = /,\s*(CA|TX|FL|IL|MA|GA|NJ|PA|CT|VA|WA|OR|NC|OH|MI|MN|CO|AZ|UT|TN|MO|MD|IN|WI|NV|KY|LA|OK|AR|NE|IA|KS|AL|SC|MS|WV|HI|AK|ID|MT|NM|ND|SD|VT|NH|ME|RI|DE|DC)\b/;
const NON_NY_STATES_EXPANDED = /,\s*(CA|TX|FL|IL|MA|GA|PA|VA|WA|OR|NC|OH|MI|MN|CO|AZ|UT|TN|MO|MD|IN|WI|NV|KY|LA|OK|AR|NE|IA|KS|AL|SC|MS|WV|HI|AK|ID|MT|NM|ND|SD|VT|NH|ME|RI|DE|DC|CT)\b/;
const NON_US_COUNTRIES = /\b(india|singapore|tokyo|japan|thailand|UAE|emirates|mumbai|bangkok|hong kong|china|UK|london|berlin|paris|france|germany|maharashtra|abu dhabi|dubai|sydney|melbourne|toronto|montreal|mexico|ireland|spain|italy|netherlands|amsterdam)\b/i;

function isLocationValid(location, lane = "wm") {
  if (!location) return false;
  if (NON_US_COUNTRIES.test(location)) return false;
  if (REMOTE_LOCATION.test(location)) return true;
  if (lane === "expanded") {
    if (NON_NY_STATES_EXPANDED.test(location)) return false;
    return VALID_EXPANDED_LOCATION.test(location);
  }
  if (NON_NY_STATES_WM.test(location)) return false;
  return VALID_NY_LOCATION.test(location);
}

function isCompanyBlocked(company) {
  const c = (company || "").toLowerCase();
  return BLOCKED_COMPANIES.some(b => c.includes(b));
}

// === WM SCORING ===
function scoreWMListing(title, description) {
  const text = `${title} ${description || ""}`.toLowerCase();
  if (KEYWORDS_NEGATIVE.some(k => text.includes(k))) {
    return { fit: "LOW", reason: "Trainee/entry-level — past your experience.", matches: [] };
  }
  const high = WM_KEYWORDS_HIGH.filter(k => text.includes(k));
  const med = WM_KEYWORDS_MED.filter(k => text.includes(k));
  if (high.length >= 2) return { fit: "HIGH", reason: `Strong match: ${high.slice(0, 3).join(", ")}.`, matches: high };
  if (high.length === 1) return { fit: "MED", reason: `Partial match: ${high[0]}${med.length ? `, plus ${med.slice(0, 2).join(", ")}` : ""}.`, matches: [...high, ...med] };
  if (med.length >= 2) return { fit: "MED", reason: `Adjacent role: ${med.slice(0, 3).join(", ")}.`, matches: med };
  return { fit: "LOW", reason: "No strong matches.", matches: [] };
}

// === EXPANDED LANE: category match + why-it-fits ===
function matchExpandedCategory(title, summary) {
  const text = `${title} ${summary || ""}`.toLowerCase();
  let bestMatch = null;
  for (const [key, group] of Object.entries(EXPANDED_CATEGORIES)) {
    const hits = group.terms.filter(t => text.includes(t));
    if (hits.length > 0 && (!bestMatch || hits.length > bestMatch.hits.length)) {
      bestMatch = { category: key, label: group.label, hits };
    }
  }
  return bestMatch;
}

function generateWhyItFits(job, category) {
  const reasons = {
    finance_adjacent: {
      base: "Your $19.9M NAA track record and 380+ financial plans demonstrate institutional finance fluency.",
      specific: {
        "investor relations": "Direct client-facing experience with HNW investors translates to IR stakeholder management.",
        "treasury": "Your asset allocation and cash flow planning work maps directly to treasury operations.",
        "compliance": "Series 7/66 + 3 years at Morgan Stanley means deep familiarity with regulatory frameworks.",
        "business development": "Your $19.9M in net acquired assets is itself a BD track record.",
        "operations": "Wealth planning workflow experience transfers to operational process roles.",
        "credit": "Financial analysis and risk assessment from your planning work transfer here.",
        "underwriter": "Plan-building involves the same risk evaluation framework underwriters use."
      }
    },
    fintech_tech: {
      base: "Your custom GenAI tool at Morgan Stanley plus client-facing financial work is an ideal fintech profile.",
      specific: {
        "customer success": "Managing 380+ client plans is customer success at scale, with quantified retention.",
        "account executive": "Your $19.9M in net acquired assets shows direct commercial selling capability.",
        "implementation": "Onboarding HNW clients into financial plans is implementation work.",
        "relationship manager": "Already doing this in WM context. Same skillset, different stack.",
        "ai": "You built a GenAI tool for wealth management. Direct experience with LLM-in-finance work.",
        "product specialist": "Your EAA pilot work involved product feedback loops with Morgan Stanley engineering."
      }
    },
    high_trust: {
      base: "EAA pilot program plus ILT coaching equals trusted operator with cross-functional execution chops.",
      specific: {
        "chief of staff": "EAA pilot put you in a strategic-execution role. Coaching colleagues equals managerial maturity.",
        "founder": "GenAI tool built ground-up plus EAA pilot equals builder mindset already proven.",
        "strategic partnerships": "Cross-functional collaboration on the GenAI tool equals partnership instinct.",
        "executive": "Senior WM Associate at Morgan Stanley equals polish, judgment, and confidentiality.",
        "business operations": "Running 380+ plans through Morgan Stanley's process is operations at scale."
      }
    }
  };

  const cat = reasons[category];
  if (!cat) return "Skills transfer from your wealth management background.";
  const titleLower = job.title.toLowerCase();
  for (const [key, text] of Object.entries(cat.specific)) {
    if (titleLower.includes(key)) return text;
  }
  return cat.base;
}

// Detect missing skills (be honest about gaps)
function detectMissingSkills(job, category) {
  const titleLower = job.title.toLowerCase();
  const text = `${job.title} ${job.summary || ""}`.toLowerCase();
  const missing = [];

  // Common asks that Matt may not have
  if (/\b(sql|python|tableau|looker|powerbi)\b/.test(text)) {
    if (!missing.includes("technical analytics tools")) missing.push("SQL/analytics tools");
  }
  if (/\b(salesforce|hubspot|crm)\b/.test(text)) {
    if (category === "fintech_tech") missing.push("CRM platform experience (Salesforce/HubSpot)");
  }
  if (/\b(mba|cfa)\b/.test(text)) missing.push("MBA/CFA preferred");
  if (titleLower.includes("director") || titleLower.includes("vp")) missing.push("More years of experience than current role suggests");
  if (titleLower.includes("senior") && titleLower.includes("manager")) {
    if (!missing.length) missing.push("Direct management experience");
  }

  return missing;
}

// === MATCH SCORE ===
const SENIOR_TERMS = /\b(senior|sr|associate|specialist|advisor|analyst|manager)\b/i;
const ENTRY_TERMS = /\b(entry|trainee|intern|junior|jr\.?|assistant)\b/i;
const NEGATIVE_TERMS = /\b(director|vice president|vp|partner|head of|chief)\b/i;

function calculateMatchScoreWM(job) {
  const text = `${job.title} ${job.summary || ""}`.toLowerCase();
  const highHits = WM_KEYWORDS_HIGH.filter(k => text.includes(k)).length;
  const medHits = WM_KEYWORDS_MED.filter(k => text.includes(k)).length;
  if (highHits === 0 && medHits === 0) {
    return Math.min(40, 20 + (job.location && VALID_NY_LOCATION.test(job.location) ? 10 : 0));
  }
  let score = 0;
  score += Math.min(50, (highHits * 12) + (medHits * 4));
  if (job.location) {
    if (VALID_NY_LOCATION.test(job.location)) score += 15;
    else if (REMOTE_LOCATION.test(job.location)) score += 10;
  }
  if (job.salary) {
    const n = parseInt((job.salary.match(/\$?(\d+)k/i) || [0,0])[1]) * 1000;
    if (n >= 70000) score += 15;
    else if (n >= 50000) score += 10;
    else if (n > 0) score += 5;
  } else { score += 6; }
  if (NEGATIVE_TERMS.test(job.title)) score -= 5;
  else if (ENTRY_TERMS.test(job.title)) score += 5;
  else if (SENIOR_TERMS.test(job.title)) score += 20;
  else score += 12;
  return Math.min(99, Math.max(15, score));
}

function calculateMatchScoreExpanded(job, categoryHits) {
  const text = `${job.title} ${job.summary || ""}`.toLowerCase();
  let score = 30; // baseline (lower than WM since transferable)
  // Direct category keyword hits
  score += Math.min(35, categoryHits * 12);
  // Location
  if (job.location) {
    if (VALID_EXPANDED_LOCATION.test(job.location)) score += 15;
    else if (REMOTE_LOCATION.test(job.location)) score += 10;
  }
  // Salary
  if (job.salary) {
    const n = parseInt((job.salary.match(/\$?(\d+)k/i) || [0,0])[1]) * 1000;
    if (n >= 80000) score += 12;
    else if (n >= 60000) score += 8;
    else if (n > 0) score += 4;
  } else { score += 5; }
  // Experience level
  if (NEGATIVE_TERMS.test(job.title)) score -= 10;
  else if (ENTRY_TERMS.test(job.title)) score += 3;
  else if (SENIOR_TERMS.test(job.title)) score += 12;
  else score += 8;
  return Math.min(99, Math.max(20, score));
}

// === SHARED helpers ===
function makeJobId(company, title, location) {
  const seed = `${company}|${title}|${location || ""}`.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9|]/g, "");
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return "j_" + Math.abs(hash).toString(36);
}

function extractSalary(text) {
  if (!text) return "";
  const patterns = [
    { rx: /\$\s*(\d{2,3})\s*[kK]\s*[-–to]+\s*\$?\s*(\d{2,3})\s*[kK]/, fmt: m => `$${m[1]}k - $${m[2]}k` },
    { rx: /\$\s*(\d{1,3}(?:,\d{3})+)\s*[-–to]+\s*\$?\s*(\d{1,3}(?:,\d{3})+)/, fmt: m => `$${m[1]} - $${m[2]}` },
    { rx: /\$\s*(\d{2,3})\s*[kK]\b(?!\s*[-–to])/, fmt: m => `$${m[1]}k` },
    { rx: /\$\s*(\d{2,3}(?:,\d{3})+)(?!\s*[-–to])/, fmt: m => `$${m[1]}` },
    { rx: /\$\s*(\d{2,3})\s*(?:\/\s*hr|per hour|\/\s*hour|an hour)/i, fmt: m => `$${m[1]}/hr` },
  ];
  for (const { rx, fmt } of patterns) {
    const m = text.match(rx);
    if (m) return fmt(m);
  }
  return "";
}

function formatAdzunaSalary(min, max) {
  if (!min && !max) return "";
  const fmt = (n) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n)}`;
  if (min && max && min !== max) return `${fmt(min)} - ${fmt(max)}`;
  return fmt(min || max);
}

function cleanRawText(text) {
  if (!text) return "";
  return text.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&hellip;/g, "...").replace(/\s+/g, " ").trim();
}
function decodeHtml(text) {
  if (!text) return "";
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

// === FLUFF STRIPPING ===
const FLUFF_PATTERNS = [
  /^[A-Z][\w\s&'.,]+ is (a |one of )?(the )?(leading|largest|premier|top|global|world|world's)/i,
  /^[A-Z][\w\s&'.,]+ is one of/i,
  /^About [A-Z]/i, /^Our mission/i, /^We are committed/i,
  /^At [A-Z][\w\s&]+,? we/i, /^Founded in \d{4}/i, /^Headquartered in/i,
  /^[A-Z][\w\s&'.,]+ specializes in/i,
  /^[A-Z][\w\s&'.,]+ provides (comprehensive|world-class|industry-leading)/i,
  /^[A-Z][\w\s&'.,]+ has (been|long|served)/i,
  /^Job Description:?\s*[A-Z][\w\s&'.,]+ is /i,
];
const PORTAL_JUNK_PATTERNS = [
  /To proceed with your application/i, /must be at least \d+ years of age/i,
  /Acknowledge \(/i, /Apply (now|today|here)/i, /Click (here|the link)/i,
  /Equal Opportunity Employer/i, /myworkdayjobs\.com/i,
  /employees are required to meet/i, /posting eligibility requirements/i,
];
const ROLE_INDICATORS = [
  /^(As an?|As the) [A-Z]/i, /^(In this role|In this position)/i, /^You (will|'ll)/i,
  /^Job Description\b/i, /^Responsibilities/i, /^The (role|position)/i,
  /^This (role|position)/i, /^Join (our|the)/i, /^We are (looking|seeking|hiring)/i,
  /^The successful candidate/i, /^The ideal candidate/i,
  /^Primary (responsibilities|duties)/i, /^Key (responsibilities|duties)/i,
  /^What you('ll| will) do/i,
];
function isFluff(s) { return FLUFF_PATTERNS.some(rx => rx.test(s.trim())); }
function isPortalJunk(s) { return PORTAL_JUNK_PATTERNS.some(rx => rx.test(s.trim())); }
function isRoleSpecific(s) {
  const t = s.trim();
  if (PORTAL_JUNK_PATTERNS.some(rx => rx.test(t))) return false;
  if (FLUFF_PATTERNS.some(rx => rx.test(t))) return false;
  return ROLE_INDICATORS.some(rx => rx.test(t));
}
function extractRoleDescription(text, maxLength = 500) {
  if (!text) return "";
  let cleaned = text.replace(/https?:\/\/[^\s)]+/g, "").replace(/\(\s*\)/g, "").replace(/Acknowledge\s*\(\s*\)/gi, "").replace(/\s+/g, " ").trim();
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
  let roleStartIdx = sentences.findIndex(s => isRoleSpecific(s));
  if (roleStartIdx === -1) {
    let i = 0;
    while (i < sentences.length && (isFluff(sentences[i]) || isPortalJunk(sentences[i]))) i++;
    roleStartIdx = i;
  }
  if (roleStartIdx >= sentences.length) return "";
  const validSentences = sentences.slice(roleStartIdx).filter(s => !isPortalJunk(s) && !isFluff(s));
  if (validSentences.length === 0) return "";
  let result = validSentences.join("").trim();
  const firstSentence = (result.match(/[^.!?]+[.!?]+/) || [result])[0];
  if (isFluff(firstSentence) || isPortalJunk(firstSentence)) return "";
  if (result.length < 80) return "";
  if (result.length > maxLength) {
    const truncated = result.slice(0, maxLength);
    const lastPeriod = truncated.lastIndexOf(".");
    result = lastPeriod > maxLength * 0.6 ? truncated.slice(0, lastPeriod + 1) : truncated + "...";
  }
  return result;
}

// === ADZUNA ===
async function fetchAdzuna(query, location, errors = [], delayMs = 0) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) { errors.push("adzuna: keys not set"); return []; }
  // Stagger to stay under Adzuna's burst rate limit. Firing 15 at once returns 429.
  if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
  const cleanLocation = location.split(",")[0].trim();
  // 14 days, not 3 — a 3-day window on a free tier returns almost nothing.
  const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=50&what=${encodeURIComponent(query)}&where=${encodeURIComponent(cleanLocation)}&max_days_old=14&sort_by=date`;
  try {
    let res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (res.status === 429) {
      // Rate limited — back off once and try again before giving up.
      await new Promise((r) => setTimeout(r, 700));
      res = await fetch(url, { headers: { "Accept": "application/json" } });
    }
    if (!res.ok) { errors.push(`adzuna "${query}" HTTP ${res.status}`); return []; }
    const data = await res.json();
    return (data.results || []).map(parseAdzunaJob).filter(Boolean);
  } catch (e) { errors.push(`adzuna "${query}" ${e.message}`); return []; }
}

function parseAdzunaJob(j) {
  if (!j.title || !j.company?.display_name) return null;
  const title = decodeHtml(j.title).trim();
  const company = decodeHtml(j.company.display_name).trim();
  const location = j.location?.display_name || "";
  const rawText = cleanRawText(j.description);
  const description = extractRoleDescription(rawText, 500);
  const salary = formatAdzunaSalary(j.salary_min, j.salary_max) || extractSalary(rawText);
  return {
    id: makeJobId(company, title, location),
    title, company, location,
    summary: description, applyUrl: j.redirect_url,
    platform: "Adzuna",
    posted: j.created ? formatDate(j.created) : "Recent",
    salary, scrapedAt: new Date().toISOString(),
    rawText, // keep for scoring
  };
}
function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    const hoursAgo = Math.floor((Date.now() - d.getTime()) / 3600000);
    if (hoursAgo < 1) return "just now";
    if (hoursAgo < 24) return `${hoursAgo}h ago`;
    return `${Math.floor(hoursAgo / 24)}d ago`;
  } catch { return "Recent"; }
}

function mergeListings(allJobs) {
  const merged = new Map();
  const sorted = [...allJobs].sort((a, b) => {
    const priority = { Greenhouse: 0, Lever: 0, Ashby: 0, Adzuna: 1 };
    return (priority[a.platform] ?? 99) - (priority[b.platform] ?? 99);
  });
  for (const job of sorted) {
    if (!merged.has(job.id)) {
      merged.set(job.id, job);
    } else {
      const existing = merged.get(job.id);
      if (!existing.summary && job.summary) existing.summary = job.summary;
      if (!existing.salary && job.salary) existing.salary = job.salary;
    }
  }
  return Array.from(merged.values());

}

// ============================================================
// ATS JOB BOARDS — stable public JSON, no scraping, no blocking
// Edit these token lists to add/remove target companies.
// A bad token fails softly and shows up in the response `errors` array.
// ============================================================

// VERIFIED WORKING as of last run. To add a company, open
// boards.greenhouse.io/<token> in a browser first — if it loads, the token is good.
const GREENHOUSE_BOARDS = [
  "carta", "betterment", "brex", "chime", "affirm",
  "addepar1",  // verified — note the trailing 1, plain "addepar" 404s
  "altruist",  // verified — Greenhouse, not Lever
];

// All three previous tokens 404'd. Verify at jobs.lever.co/<token> before adding.
const LEVER_BOARDS = [];

// Verify at jobs.ashbyhq.com/<token> before adding.
const ASHBY_BOARDS = ["savvy"];

const ATS_TITLE_FILTER = /\b(wealth|advisor|adviser|planning|planner|client|customer success|account executive|account manager|implementation|onboarding|solutions|relationship manager|partnerships|equity comp|stock plan|business development|operations associate|chief of staff)\b/i;

async function fetchGreenhouse(token, errors) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) { errors.push(`greenhouse:${token} HTTP ${res.status}`); return []; }
    const data = await res.json();
    return (data.jobs || []).map((j) => {
      const title = decodeHtml(j.title || "").trim();
      if (!ATS_TITLE_FILTER.test(title)) return null;
      const location = j.location?.name || "";
      const rawText = cleanRawText(decodeHtml(j.content || ""));
      return {
        id: makeJobId(token, title, location),
        title,
        company: token.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        location,
        summary: extractRoleDescription(rawText, 500),
        applyUrl: j.absolute_url,
        platform: "Greenhouse",
        posted: j.updated_at ? formatDate(j.updated_at) : "Recent",
        salary: extractSalary(rawText),
        scrapedAt: new Date().toISOString(),
        rawText,
      };
    }).filter(Boolean);
  } catch (e) {
    errors.push(`greenhouse:${token} ${e.message}`);
    return [];
  }
}

async function fetchLever(token, errors) {
  const url = `https://api.lever.co/v0/postings/${token}?mode=json`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) { errors.push(`lever:${token} HTTP ${res.status}`); return []; }
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map((j) => {
      const title = decodeHtml(j.text || "").trim();
      if (!ATS_TITLE_FILTER.test(title)) return null;
      const location = j.categories?.location || "";
      const rawText = cleanRawText(decodeHtml(j.descriptionPlain || j.description || ""));
      return {
        id: makeJobId(token, title, location),
        title,
        company: token.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        location,
        summary: extractRoleDescription(rawText, 500),
        applyUrl: j.hostedUrl,
        platform: "Lever",
        posted: j.createdAt ? formatDate(new Date(j.createdAt).toISOString()) : "Recent",
        salary: extractSalary(rawText),
        scrapedAt: new Date().toISOString(),
        rawText,
      };
    }).filter(Boolean);
  } catch (e) {
    errors.push(`lever:${token} ${e.message}`);
    return [];
  }
}

async function fetchAshby(token, errors) {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${token}?includeCompensation=true`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) { errors.push(`ashby:${token} HTTP ${res.status}`); return []; }
    const data = await res.json();
    return (data.jobs || []).map((j) => {
      const title = decodeHtml(j.title || "").trim();
      if (!ATS_TITLE_FILTER.test(title)) return null;
      const location = j.location || "";
      const rawText = cleanRawText(decodeHtml(j.descriptionPlain || ""));
      return {
        id: makeJobId(token, title, location),
        title,
        company: data.name || token,
        location,
        summary: extractRoleDescription(rawText, 500),
        applyUrl: j.jobUrl || j.applyUrl,
        platform: "Ashby",
        posted: j.publishedAt ? formatDate(j.publishedAt) : "Recent",
        salary: j.compensation?.summary || extractSalary(rawText),
        scrapedAt: new Date().toISOString(),
        rawText,
      };
    }).filter(Boolean);
  } catch (e) {
    errors.push(`ashby:${token} ${e.message}`);
    return [];
  }
}

// ============================================================
// AI SCORING — Claude Haiku, batched. Replaces keyword counting.
// Falls back silently to the keyword score if the key is missing,
// the call fails, or we're running out of time budget.
// ============================================================

const CANDIDATE_PROFILE = `
Matt Putterman — Senior Wealth Management Associate, Morgan Stanley (NYC), since Oct 2024.
Prior: Wealth Management Analyst, Morgan Stanley (Jun 2022–Oct 2024); Financial Advisor, Equitable Advisors (2021–2022).
Licenses: Series 7, Series 66, Life & Health Insurance, Financial Planning Specialist.
Education: BS Financial Economics, Binghamton University (2021). ~4 years post-grad experience.
Track record: 380+ financial plans delivered, avg $1.3M external assets per plan; $19.96M net acquired assets YTD 2024.
Differentiators: selected for Equity Award Analysis (EAA) pilot — equity comp / RSU / stock option planning.
Co-built a production GenAI (GPT) tool for advisor workflows: client summaries, meeting agendas, next steps.
Leads instructor-led training for colleagues. Tools: MoneyGuide Pro, MS Office.
Targets: NYC metro or remote. Compensation floor $100K total comp.
Wants: senior associate / specialist / client-facing roles in wealth management, RIA, equity compensation,
or WealthTech (client solutions, customer success, implementation). Not interested in commission-only,
trainee, or entry-level roles, or in pure insurance sales.
`.trim();

async function scoreBatchWithAI(jobs, apiKey) {
  const compact = jobs.map((j, i) => ({
    i,
    title: j.title,
    company: j.company,
    location: j.location,
    salary: j.salary || "not listed",
    desc: (j.summary || j.rawText || "").slice(0, 700),
  }));

  const prompt = `You are screening job listings for one specific candidate. Score each on genuine fit.

CANDIDATE:
${CANDIDATE_PROFILE}

LISTINGS (JSON):
${JSON.stringify(compact)}

For each listing return an object with:
- "i": the listing index
- "score": 0-100 fit. Be harsh and use the full range. 80+ means he is a strong applicant who should apply today. 60-79 means plausible but a stretch or a slight step down. Below 40 means do not bother. Penalize commission-only, trainee, entry-level, insurance-sales, and roles requiring 10+ years or a CFA/MBA he lacks. Penalize total comp likely below $100K. Reward equity-comp/RSU/stock-plan work, financial planning depth, WealthTech client-facing roles, and anything using AI tooling for advisors.
- "reason": one sentence, max 20 words, addressed to the candidate, explaining the score concretely. No fluff.
- "gap": the single biggest thing he lacks for this role, max 8 words. Empty string if none.

Return ONLY a JSON array. No markdown, no preamble.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1400,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`anthropic HTTP ${res.status}`);
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(clean);
}

async function applyAIScores(jobs, apiKey, deadline, errors) {
  if (!apiKey) { errors.push("ANTHROPIC_API_KEY not set — using keyword scores"); return; }
  if (Date.now() > deadline) { errors.push("time budget exhausted — using keyword scores"); return; }

  const BATCH = 8;
  const batches = [];
  for (let i = 0; i < jobs.length; i += BATCH) batches.push(jobs.slice(i, i + BATCH));

  const results = await Promise.allSettled(
    batches.map((b) => scoreBatchWithAI(b, apiKey))
  );

  results.forEach((r, bi) => {
    if (r.status !== "fulfilled") {
      errors.push(`ai-batch-${bi}: ${r.reason?.message || "failed"}`);
      return;
    }
    const batch = batches[bi];
    for (const item of r.value) {
      const job = batch[item.i];
      if (!job) continue;
      job.matchScore = Math.max(0, Math.min(99, Math.round(item.score)));
      job.fitReason = item.reason;
      job.aiScored = true;
      if (item.gap) job.missingSkills = [item.gap];
      // Calibrated to observed output: the model tops out around 75-78 on a
      // genuinely strong match, so 80 as a HIGH gate meant nothing ever cleared it.
      job.fit = job.matchScore >= 70 ? "HIGH" : job.matchScore >= 50 ? "MED" : "LOW";
    }
  });
}

// === NEAR-DUPLICATE COLLAPSE ===
// Big banks post the same role once per branch. Normalizing company and title
// so "Private Client Advisor - Manhattan (Upper Eastside)" and
// "...(Midtown West)" collapse into a single card.
const COMPANY_ALIASES = [
  [/^(j\.?\s?p\.?\s?morgan|jpmorgan).*/i, "JPMorgan Chase"],
  [/^bank of america.*/i, "Bank of America"],
  [/^(citi|citigroup).*/i, "Citigroup"],
  [/^morgan stanley.*/i, "Morgan Stanley"],
  [/^addepar.*/i, "Addepar"],
];

function normalizeCompany(name) {
  const raw = (name || "").trim();
  for (const [rx, canonical] of COMPANY_ALIASES) if (rx.test(raw)) return canonical;
  return raw.replace(/,?\s*(inc|llc|ltd|n\.?a\.?|& co\.?)\.?$/i, "").trim();
}

const LOCATION_HINT = /\b(ny|nyc|new york|manhattan|brooklyn|queens|bronx|staten island|midtown|downtown|uptown|east ?side|west ?side|empire state|new brighton|arden heights|remote|usa|us|philadelphia|pa|nj|west coast|east coast)\b/i;

function normalizeTitle(title) {
  let t = (title || "").replace(/\([^)]*\)/g, " ");
  const parts = t.split(/\s+[-\u2013\u2014|]\s+/);
  while (parts.length > 1 && LOCATION_HINT.test(parts[parts.length - 1])) parts.pop();
  t = parts.join(" - ");
  return t.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function collapseDuplicates(jobs) {
  const byKey = new Map();
  for (const j of jobs) {
    j.company = normalizeCompany(j.company);
    const key = `${j.company.toLowerCase()}|${normalizeTitle(j.title)}`;
    const existing = byKey.get(key);
    if (!existing) { byKey.set(key, j); continue; }
    existing.duplicateCount = (existing.duplicateCount || 1) + 1;
    if (!existing.salary && j.salary) { existing.salary = j.salary; existing.applyUrl = j.applyUrl; }
  }
  return Array.from(byKey.values());
}

// ============================================================
// MAIN — plain HTTP handler. All I/O parallel. Time-budgeted.
// ============================================================

export const handler = async () => {
  const started = Date.now();
  const AI_DEADLINE = started + 5000; // leave ~5s for scoring inside a 10s function
  const errors = [];

  // Adzuna's free tier rejects bursts. Space every query 300ms apart across
  // both lanes rather than firing all of them simultaneously.
  let slot = 0;
  const adzunaWM = WM_SEARCHES.map((s) => fetchAdzuna(s.query, s.location, errors, slot++ * 150));
  const adzunaExp = EXPANDED_SEARCHES.map((s) => fetchAdzuna(s.query, s.location, errors, slot++ * 150));
  const ats = [
    ...GREENHOUSE_BOARDS.map((t) => fetchGreenhouse(t, errors)),
    ...LEVER_BOARDS.map((t) => fetchLever(t, errors)),
    ...ASHBY_BOARDS.map((t) => fetchAshby(t, errors)),
  ];

  const [wmSettled, expSettled, atsSettled] = await Promise.all([
    Promise.allSettled(adzunaWM),
    Promise.allSettled(adzunaExp),
    Promise.allSettled(ats),
  ]);

  const flat = (settled, label) =>
    settled.flatMap((r, i) => {
      if (r.status === "fulfilled") return r.value;
      errors.push(`${label}[${i}]: ${r.reason?.message || "failed"}`);
      return [];
    });

  // Route each ATS job to exactly one lane: WM if it hits real wealth-management
  // keywords, otherwise the expanded lane. Without this the WM lane swallows
  // every ATS listing and the expanded lane comes back empty.
  const atsJobs = flat(atsSettled, "ats");
  const atsWM = [];
  const atsExp = [];
  for (const j of atsJobs) {
    const t = `${j.title} ${j.summary || j.rawText || ""}`.toLowerCase();
    (WM_KEYWORDS_HIGH.some((k) => t.includes(k)) ? atsWM : atsExp).push(j);
  }

  const wmRaw = [...flat(wmSettled, "adzuna-wm"), ...atsWM];
  const expRaw = [...flat(expSettled, "adzuna-exp"), ...atsExp];

  // === WM LANE ===
  const wmFiltered = wmRaw.filter(
    (j) => !isCompanyBlocked(j.company) && isLocationValid(j.location, "wm")
  );
  const wmUnique = mergeListings(wmFiltered);
  for (const j of wmUnique) {
    const text = j.summary || j.rawText || "";
    const scoring = scoreWMListing(j.title, text);
    j.fit = scoring.fit;
    j.fitReason = scoring.reason;
    j.keyMatch = scoring.matches?.slice(0, 4) || [];
    j.matchScore = calculateMatchScoreWM(j);
    j.lane = "wm";
  }

  // === EXPANDED LANE ===
  const wmIds = new Set(wmUnique.map((j) => j.id));
  const expFiltered = expRaw.filter(
    (j) =>
      !isCompanyBlocked(j.company) &&
      isLocationValid(j.location, "expanded") &&
      !wmIds.has(j.id)
  );
  const expUnique = mergeListings(expFiltered);
  const expScored = [];
  for (const j of expUnique) {
    const text = j.summary || j.rawText || "";
    const match = matchExpandedCategory(j.title, text);
    if (!match) continue;
    j.expandedCategory = match.category;
    j.expandedLabel = match.label;
    j.fit = match.hits.length >= 2 ? "HIGH" : "MED";
    j.fitReason = generateWhyItFits(j, match.category);
    j.keyMatch = match.hits.slice(0, 4);
    j.matchScore = calculateMatchScoreExpanded(j, match.hits.length);
    j.missingSkills = detectMissingSkills(j, match.category);
    j.lane = "expanded";
    expScored.push(j);
  }

  // === AI SCORING — top candidates only, both lanes, in parallel ===
  wmUnique.sort((a, b) => b.matchScore - a.matchScore);
  expScored.sort((a, b) => b.matchScore - a.matchScore);

  // Collapse near-duplicates BEFORE scoring: fewer jobs means the AI budget
  // now covers the whole list instead of the first 24.
  const wmCollapsed = collapseDuplicates(wmUnique);
  const expCollapsed = collapseDuplicates(expScored);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  await Promise.all([
    applyAIScores(wmCollapsed.slice(0, 28), apiKey, AI_DEADLINE, errors),
    applyAIScores(expCollapsed.slice(0, 28), apiKey, AI_DEADLINE, errors),
  ]);

  // Re-sort with AI scores, then drop the clear rejects. Anything the model
  // scored under 35 is noise Matt should never have to scroll past.
  // Previously anything without an AI score bypassed this filter entirely,
  // which is how a reinsurance SVP role at 29 stayed in the wealth lane.
  const MIN_SCORE = 35;
  const keep = (arr) => {
    const filtered = arr.filter((j) => j.matchScore >= MIN_SCORE);
    return filtered.length ? filtered : arr.slice(0, 5);
  };
  let wmFinal = keep(wmCollapsed);
  let expFinal = keep(expCollapsed);
  wmFinal.sort((a, b) => b.matchScore - a.matchScore);
  expFinal.sort((a, b) => b.matchScore - a.matchScore);
  for (const j of [...wmFinal, ...expFinal]) delete j.rawText;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      wm: wmFinal,
      expanded: expFinal,
      lastUpdated: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      aiScored: wmFinal.some((j) => j.aiScored) || expFinal.some((j) => j.aiScored),
      errors,
      counts: {
        wm: {
          total: wmFinal.length,
          high: wmFinal.filter((j) => j.fit === "HIGH").length,
          med: wmFinal.filter((j) => j.fit === "MED").length,
          low: wmFinal.filter((j) => j.fit === "LOW").length,
        },
        expanded: {
          total: expFinal.length,
          high: expFinal.filter((j) => j.fit === "HIGH").length,
          med: expFinal.filter((j) => j.fit === "MED").length,
        },
      },
    }),
  };
};
