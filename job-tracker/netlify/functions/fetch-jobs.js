// netlify/functions/fetch-jobs.js
// v2 — hard filtering by location/company, match scoring, fluff stripping

import { schedule } from "@netlify/functions";

const SEARCHES = [
  { query: "wealth management associate", location: "New York, NY" },
  { query: "financial advisor series 7", location: "New York, NY" },
  { query: "financial planning associate", location: "New York, NY" },
  { query: "wealth management", location: "Remote" },
];

const KEYWORDS_HIGH = [
  "series 7", "series 66", "wealth management", "financial planning",
  "financial advisor", "financial planner", "wealth advisor",
  "client associate", "private wealth", "financial planning specialist"
];
const KEYWORDS_MED = [
  "fintech", "registered representative", "investment advisor",
  "client services", "equity compensation", "rsu", "stock options",
  "insurance", "client success", "relationship manager"
];
const KEYWORDS_NEGATIVE = [
  "trainee", "intern", "no experience", "we'll sponsor", "sponsor your licenses",
  "entry level no experience", "commission only", "100% commission",
  "trainee program", "career changer"
];

// === HARD FILTERS ===
const BLOCKED_COMPANIES = [
  "equitable advisors", "northwestern mutual", "new york life insurance"
];
const VALID_NY_LOCATION = /\b(new york|nyc|brooklyn|manhattan|queens|bronx|staten island|long island|westchester|yonkers|white plains|garden city|hempstead|mineola)\b/i;
const REMOTE_LOCATION = /\bremote\b/i;
const NON_NY_STATES = /,\s*(CA|TX|FL|IL|MA|GA|NJ|PA|CT|VA|WA|OR|NC|OH|MI|MN|CO|AZ|UT|TN|MO|MD|IN|WI|NV|KY|LA|OK|AR|NE|IA|KS|AL|SC|MS|WV|HI|AK|ID|MT|NM|ND|SD|VT|NH|ME|RI|DE|DC)\b/;
const NON_US_COUNTRIES = /\b(india|singapore|tokyo|japan|thailand|UAE|emirates|mumbai|bangkok|hong kong|china|UK|london|berlin|paris|france|germany|maharashtra|abu dhabi|dubai|sydney|melbourne|toronto|montreal|mexico)\b/i;

function isLocationValid(location) {
  if (!location) return false;
  if (NON_US_COUNTRIES.test(location)) return false;
  if (REMOTE_LOCATION.test(location)) return true;
  if (NON_NY_STATES.test(location)) return false;
  return VALID_NY_LOCATION.test(location);
}

function isCompanyBlocked(company) {
  const c = (company || "").toLowerCase();
  return BLOCKED_COMPANIES.some(b => c.includes(b));
}

// === FLUFF STRIPPING ===
const FLUFF_PATTERNS = [
  /^[A-Z][\w\s&'.,]+ is (a |one of )?(the )?(leading|largest|premier|top|global|world|world's)/i,
  /^[A-Z][\w\s&'.,]+ is one of/i,
  /^About [A-Z]/i,
  /^Our mission/i,
  /^We are committed/i,
  /^At [A-Z][\w\s&]+,? we/i,
  /^Founded in \d{4}/i,
  /^Headquartered in/i,
  /^[A-Z][\w\s&'.,]+ specializes in/i,
  /^[A-Z][\w\s&'.,]+ provides (comprehensive|world-class|industry-leading)/i,
  /^[A-Z][\w\s&'.,]+ has (been|long|served)/i,
  /^Job Description:?\s*[A-Z][\w\s&'.,]+ is /i,
];
const PORTAL_JUNK_PATTERNS = [
  /To proceed with your application/i,
  /must be at least \d+ years of age/i,
  /Acknowledge \(/i,
  /Apply (now|today|here)/i,
  /Click (here|the link)/i,
  /Equal Opportunity Employer/i,
  /myworkdayjobs\.com/i,
  /employees are required to meet/i,
  /posting eligibility requirements/i,
];
const ROLE_INDICATORS = [
  /^(As an?|As the) [A-Z]/i,
  /^(In this role|In this position)/i,
  /^You (will|'ll)/i,
  /^Job Description\b/i,
  /^Responsibilities/i,
  /^The (role|position)/i,
  /^This (role|position)/i,
  /^Join (our|the)/i,
  /^We are (looking|seeking|hiring)/i,
  /^The successful candidate/i,
  /^The ideal candidate/i,
  /^Primary (responsibilities|duties)/i,
  /^Key (responsibilities|duties)/i,
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
  let cleaned = text
    .replace(/https?:\/\/[^\s)]+/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/Acknowledge\s*\(\s*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
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

// === MATCH SCORE ===
const SENIOR_TERMS = /\b(senior|sr|associate|specialist|advisor|analyst|manager)\b/i;
const ENTRY_TERMS = /\b(entry|trainee|intern|junior|jr\.?|assistant)\b/i;
const NEGATIVE_TERMS = /\b(director|vice president|vp|partner|head of|chief)\b/i;

function calculateMatchScore(job) {
  const text = `${job.title} ${job.summary || ""}`.toLowerCase();
  const highHits = KEYWORDS_HIGH.filter(k => text.includes(k)).length;
  const medHits = KEYWORDS_MED.filter(k => text.includes(k)).length;

  // Hard fail: zero relevant keywords = wrong industry
  if (highHits === 0 && medHits === 0) {
    return Math.min(40, 20 + (job.location && VALID_NY_LOCATION.test(job.location) ? 10 : 0));
  }

  let score = 0;
  score += Math.min(50, (highHits * 12) + (medHits * 4));

  // Location
  if (job.location) {
    if (VALID_NY_LOCATION.test(job.location)) score += 15;
    else if (REMOTE_LOCATION.test(job.location)) score += 10;
  }

  // Salary (uses default $70k threshold; client can override)
  if (job.salary) {
    const salaryNum = parseInt((job.salary.match(/\$?(\d+)k/i) || [0,0])[1]) * 1000;
    if (salaryNum >= 70000) score += 15;
    else if (salaryNum >= 50000) score += 10;
    else if (salaryNum > 0) score += 5;
  } else {
    score += 6;
  }

  // Experience
  if (NEGATIVE_TERMS.test(job.title)) score -= 5;
  else if (ENTRY_TERMS.test(job.title)) score += 5;
  else if (SENIOR_TERMS.test(job.title)) score += 20;
  else score += 12;

  return Math.min(99, Math.max(15, score));
}

// === SCORING ===
function makeJobId(company, title, location) {
  const seed = `${company}|${title}|${location || ""}`.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9|]/g, "");
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return "j_" + Math.abs(hash).toString(36);
}

function scoreListing(title, description) {
  const text = `${title} ${description || ""}`.toLowerCase();
  if (KEYWORDS_NEGATIVE.some(k => text.includes(k))) {
    return { fit: "LOW", reason: "Trainee/entry-level — past your experience.", matches: [] };
  }
  const high = KEYWORDS_HIGH.filter(k => text.includes(k));
  const med = KEYWORDS_MED.filter(k => text.includes(k));
  if (high.length >= 2) return { fit: "HIGH", reason: `Strong match: ${high.slice(0, 3).join(", ")}.`, matches: high };
  if (high.length === 1) return { fit: "MED", reason: `Partial match: ${high[0]}${med.length ? `, plus ${med.slice(0, 2).join(", ")}` : ""}.`, matches: [...high, ...med] };
  if (med.length >= 2) return { fit: "MED", reason: `Adjacent role: ${med.slice(0, 3).join(", ")}.`, matches: med };
  return { fit: "LOW", reason: "No strong matches.", matches: [] };
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

// === ADZUNA ===
async function fetchAdzuna(query, location) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];
  const cleanLocation = location.split(",")[0].trim();
  const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=20&what=${encodeURIComponent(query)}&where=${encodeURIComponent(cleanLocation)}&max_days_old=3&sort_by=date`;
  try {
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) { console.error(`Adzuna ${res.status}`); return []; }
    const data = await res.json();
    return (data.results || []).map(parseAdzunaJob).filter(Boolean);
  } catch (e) { console.error("Adzuna failed:", e.message); return []; }
}

function parseAdzunaJob(j) {
  if (!j.title || !j.company?.display_name) return null;
  const title = decodeHtml(j.title).trim();
  const company = decodeHtml(j.company.display_name).trim();
  const location = j.location?.display_name || "";
  const rawText = cleanRawText(j.description);
  const description = extractRoleDescription(rawText, 500);
  const salary = formatAdzunaSalary(j.salary_min, j.salary_max) || extractSalary(rawText);
  const id = makeJobId(company, title, location);
  const scoring = scoreListing(title, rawText);
  return {
    id, title, company, location,
    summary: description, applyUrl: j.redirect_url,
    platform: "Adzuna",
    posted: j.created ? formatDate(j.created) : "Recent",
    fit: scoring.fit, fitReason: scoring.reason,
    keyMatch: scoring.matches?.slice(0, 4) || [],
    salary, scrapedAt: new Date().toISOString(),
  };
}

// === LINKEDIN ===
async function fetchLinkedIn(query, location) {
  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&f_TPR=r86400&start=0`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" } });
    if (!res.ok) { console.error(`LinkedIn ${res.status}`); return []; }
    const html = await res.text();
    return parseLinkedInHTML(html);
  } catch (e) { console.error("LinkedIn failed:", e.message); return []; }
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
    const id = makeJobId(company, title, location);
    const scoring = scoreListing(title, "");
    items.push({
      id, title, company, location,
      summary: "", applyUrl: url,
      platform: "LinkedIn",
      posted: dateMatch ? formatDate(dateMatch[1]) : "Recent",
      fit: scoring.fit, fitReason: scoring.reason,
      keyMatch: scoring.matches?.slice(0, 4) || [],
      salary, scrapedAt: new Date().toISOString(),
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
    const days = Math.floor(hoursAgo / 24);
    return `${days}d ago`;
  } catch { return "Recent"; }
}

function mergeListings(allJobs) {
  const merged = new Map();
  const sorted = [...allJobs].sort((a, b) => {
    const priority = { Adzuna: 0, LinkedIn: 1, Indeed: 2 };
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

const scrapeHandler = async (event, context) => {
  console.log("Job scraper running at", new Date().toISOString());
  const allJobs = [];

  for (const search of SEARCHES) {
    const [adzunaJobs, linkedinJobs] = await Promise.all([
      fetchAdzuna(search.query, search.location),
      fetchLinkedIn(search.query, search.location),
    ]);
    allJobs.push(...adzunaJobs, ...linkedinJobs);
  }

  const beforeFilter = allJobs.length;

  // === HARD FILTER: location + blocked companies ===
  const filtered = allJobs.filter(j =>
    !isCompanyBlocked(j.company) && isLocationValid(j.location)
  );
  const afterFilter = filtered.length;
  console.log(`Filtered ${beforeFilter} → ${afterFilter} (removed ${beforeFilter - afterFilter} junk)`);

  const unique = mergeListings(filtered);

  // Re-score with descriptions, then add match score
  for (const job of unique) {
    if (job.summary) {
      const rescore = scoreListing(job.title, job.summary);
      job.fit = rescore.fit;
      job.fitReason = rescore.reason;
      job.keyMatch = rescore.matches?.slice(0, 4) || [];
    }
    job.matchScore = calculateMatchScore(job);
  }

  // Sort by match score descending
  unique.sort((a, b) => b.matchScore - a.matchScore);

  console.log(`Returning ${unique.length} unique listings`);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      jobs: unique,
      lastUpdated: new Date().toISOString(),
      counts: {
        total: unique.length,
        high: unique.filter(j => j.fit === "HIGH").length,
        med: unique.filter(j => j.fit === "MED").length,
        low: unique.filter(j => j.fit === "LOW").length,
        avgMatch: Math.round(unique.reduce((s, j) => s + (j.matchScore || 0), 0) / Math.max(1, unique.length)),
      }
    }),
  };
};

export const handler = schedule("0 12,20 * * *", scrapeHandler);
