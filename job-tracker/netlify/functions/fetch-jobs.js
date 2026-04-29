// netlify/functions/fetch-jobs.js
// v3 — Two lanes: Wealth Management + Expanded Opportunities

import { schedule } from "@netlify/functions";

// === WM LANE searches ===
const WM_SEARCHES = [
  { query: "wealth management associate", location: "New York, NY" },
  { query: "financial advisor series 7", location: "New York, NY" },
  { query: "financial planning associate", location: "New York, NY" },
  { query: "wealth management", location: "Remote" },
];

// === EXPANDED LANE searches ===
const EXPANDED_SEARCHES = [
  { query: "investor relations associate", location: "New York, NY" },
  { query: "treasury analyst", location: "New York, NY" },
  { query: "compliance analyst finance", location: "New York, NY" },
  { query: "customer success fintech", location: "New York, NY" },
  { query: "account executive fintech", location: "New York, NY" },
  { query: "implementation manager fintech", location: "New York, NY" },
  { query: "chief of staff", location: "New York, NY" },
  { query: "strategic partnerships finance", location: "New York, NY" },
  { query: "founders associate", location: "New York, NY" },
  { query: "business development financial services", location: "New York, NY" },
  { query: "customer success", location: "Remote" },
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
async function fetchAdzuna(query, location) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];
  const cleanLocation = location.split(",")[0].trim();
  const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=15&what=${encodeURIComponent(query)}&where=${encodeURIComponent(cleanLocation)}&max_days_old=3&sort_by=date`;
  try {
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map(parseAdzunaJob).filter(Boolean);
  } catch (e) { return []; }
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

// === LINKEDIN ===
async function fetchLinkedIn(query, location) {
  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&f_TPR=r86400&start=0`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" } });
    if (!res.ok) return [];
    const html = await res.text();
    return parseLinkedInHTML(html);
  } catch (e) { return []; }
}

function parseLinkedInHTML(html) {
  const items = [];
  const cardRegex = /<li[^>]*>[\s\S]*?<\/li>/g;
  const cards = html.match(cardRegex) || [];
  for (const card of cards) {
    const titleMatch = card.match(/<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/);
    const companyMatch = card.match(/<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>([\s\S]*?)<\/h4>/);
    const locationMatch = card.match(/<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)<\/span>/);
    const linkMatch = card.match(/<a[^>]*class="[^"]*base-card__full-link[^"]*"[^>]*href="([^"]+)"/);
    const dateMatch = card.match(/<time[^>]*datetime="([^"]+)"/);
    const salaryMatch = card.match(/<span[^>]*class="[^"]*job-search-card__salary[^"]*"[^>]*>([\s\S]*?)<\/span>/);
    if (!titleMatch || !linkMatch) continue;
    const title = decodeHtml(titleMatch[1].replace(/<[^>]+>/g, "").trim());
    const company = decodeHtml((companyMatch?.[1] || "").replace(/<[^>]+>/g, "").trim()) || "Unknown";
    const location = decodeHtml((locationMatch?.[1] || "").replace(/<[^>]+>/g, "").trim());
    const url = linkMatch[1].split("?")[0];
    const rawSalaryText = (salaryMatch?.[1] || "").replace(/<[^>]+>/g, "").trim();
    const salary = rawSalaryText ? rawSalaryText.replace(/\s+/g, " ").slice(0, 50) : "";
    items.push({
      id: makeJobId(company, title, location),
      title, company, location,
      summary: "", applyUrl: url,
      platform: "LinkedIn",
      posted: dateMatch ? formatDate(dateMatch[1]) : "Recent",
      salary, scrapedAt: new Date().toISOString(),
      rawText: title,
    });
  }
  return items;
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
    const priority = { Adzuna: 0, LinkedIn: 1 };
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

// === MAIN ===
const scrapeHandler = async (event, context) => {
  console.log("v3 scraper running at", new Date().toISOString());

  // Pull both lanes in parallel
  const wmRaw = [];
  const expRaw = [];

  for (const search of WM_SEARCHES) {
    const [a, l] = await Promise.all([
      fetchAdzuna(search.query, search.location),
      fetchLinkedIn(search.query, search.location),
    ]);
    wmRaw.push(...a, ...l);
  }
  for (const search of EXPANDED_SEARCHES) {
    const [a, l] = await Promise.all([
      fetchAdzuna(search.query, search.location),
      fetchLinkedIn(search.query, search.location),
    ]);
    expRaw.push(...a, ...l);
  }

  // === WM LANE processing ===
  const wmFiltered = wmRaw.filter(j =>
    !isCompanyBlocked(j.company) && isLocationValid(j.location, "wm")
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
    delete j.rawText;
  }

  // === EXPANDED LANE processing ===
  const wmIds = new Set(wmUnique.map(j => j.id)); // dedup against WM
  const expFiltered = expRaw.filter(j =>
    !isCompanyBlocked(j.company)
    && isLocationValid(j.location, "expanded")
    && !wmIds.has(j.id)
  );
  const expUnique = mergeListings(expFiltered);

  // Filter expanded to only items with category match
  const expScored = [];
  for (const j of expUnique) {
    const text = j.summary || j.rawText || "";
    const match = matchExpandedCategory(j.title, text);
    if (!match) continue; // drop if no expanded category matches

    j.expandedCategory = match.category;
    j.expandedLabel = match.label;
    j.fit = match.hits.length >= 2 ? "HIGH" : "MED";
    j.fitReason = generateWhyItFits(j, match.category);
    j.keyMatch = match.hits.slice(0, 4);
    j.matchScore = calculateMatchScoreExpanded(j, match.hits.length);
    j.missingSkills = detectMissingSkills(j, match.category);
    j.lane = "expanded";
    delete j.rawText;
    expScored.push(j);
  }

  // Sort each lane by match score desc
  wmUnique.sort((a, b) => b.matchScore - a.matchScore);
  expScored.sort((a, b) => b.matchScore - a.matchScore);

  console.log(`WM: ${wmUnique.length} | Expanded: ${expScored.length}`);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      wm: wmUnique,
      expanded: expScored,
      lastUpdated: new Date().toISOString(),
      counts: {
        wm: { total: wmUnique.length, high: wmUnique.filter(j => j.fit === "HIGH").length, med: wmUnique.filter(j => j.fit === "MED").length, low: wmUnique.filter(j => j.fit === "LOW").length },
        expanded: { total: expScored.length, high: expScored.filter(j => j.fit === "HIGH").length, med: expScored.filter(j => j.fit === "MED").length },
      }
    }),
  };
};

export const handler = schedule("0 12,20 * * *", scrapeHandler);
