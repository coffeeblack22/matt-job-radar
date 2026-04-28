// netlify/functions/fetch-jobs.js
// Scheduled function — scrapes LinkedIn + Adzuna, scores, deduplicates,
// strips marketing fluff from descriptions

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

// === Patterns that signal company boilerplate (skip these) ===
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
];

// === Patterns that signal real role description (start here) ===
const ROLE_INDICATORS = [
  /^(As an?|As the) [A-Z]/i,
  /^(In this role|In this position)/i,
  /^You (will|'ll)/i,
  /^Job Description/i,
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

function isFluff(sentence) {
  return FLUFF_PATTERNS.some(rx => rx.test(sentence.trim()));
}

function isRoleSpecific(sentence) {
  return ROLE_INDICATORS.some(rx => rx.test(sentence.trim()));
}

// Strips company boilerplate, returns role-specific section only
function extractRoleDescription(text, maxLength = 500) {
  if (!text) return "";
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  // First, look for an explicit role indicator
  let roleStartIdx = sentences.findIndex(s => isRoleSpecific(s));

  // If no role indicator, skip leading fluff sentences
  if (roleStartIdx === -1) {
    let i = 0;
    while (i < sentences.length && isFluff(sentences[i])) {
      i++;
    }
    roleStartIdx = i;
  }

  // All fluff, no role content? Return empty (honest > misleading)
  if (roleStartIdx >= sentences.length) return "";

  let result = sentences.slice(roleStartIdx).join("").trim();
  if (result.length > maxLength) {
    const truncated = result.slice(0, maxLength);
    const lastPeriod = truncated.lastIndexOf(".");
    result = lastPeriod > maxLength * 0.6
      ? truncated.slice(0, lastPeriod + 1)
      : truncated + "...";
  }
  return result;
}

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
    return { fit: "LOW", reason: "Trainee/entry-level role — past your experience level." };
  }
  const high = KEYWORDS_HIGH.filter(k => text.includes(k));
  const med = KEYWORDS_MED.filter(k => text.includes(k));
  if (high.length >= 2) return { fit: "HIGH", reason: `Strong match: ${high.slice(0, 3).join(", ")}.`, matches: high };
  if (high.length === 1) return { fit: "MED", reason: `Partial match: ${high[0]}${med.length ? `, plus ${med.slice(0, 2).join(", ")}` : ""}.`, matches: [...high, ...med] };
  if (med.length >= 2) return { fit: "MED", reason: `Adjacent role: ${med.slice(0, 3).join(", ")}.`, matches: med };
  return { fit: "LOW", reason: "No strong keyword matches.", matches: [] };
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
  const fmt = (n) => {
    if (n >= 1000) return `$${Math.round(n / 1000)}k`;
    return `$${Math.round(n)}`;
  };
  if (min && max && min !== max) return `${fmt(min)} - ${fmt(max)}`;
  return fmt(min || max);
}

// Strip HTML tags + decode entities + normalize whitespace
function cleanRawText(text) {
  if (!text) return "";
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// === ADZUNA ===
async function fetchAdzuna(query, location) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    console.warn("Adzuna credentials missing — skipping");
    return [];
  }
  const cleanLocation = location.split(",")[0].trim();
  const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=20&what=${encodeURIComponent(query)}&where=${encodeURIComponent(cleanLocation)}&max_days_old=3&sort_by=date`;
  try {
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) { console.error(`Adzuna ${res.status} for ${query}`); return []; }
    const data = await res.json();
    return (data.results || []).map(parseAdzunaJob).filter(Boolean);
  } catch (e) {
    console.error("Adzuna fetch failed:", e.message);
    return [];
  }
}

function parseAdzunaJob(j) {
  if (!j.title || !j.company?.display_name) return null;
  const title = decodeHtml(j.title).trim();
  const company = decodeHtml(j.company.display_name).trim();
  const location = j.location?.display_name || "";

  // Two-step: clean raw text, then strip marketing fluff
  const rawText = cleanRawText(j.description);
  const description = extractRoleDescription(rawText, 500);

  const salary = formatAdzunaSalary(j.salary_min, j.salary_max) || extractSalary(rawText);
  const id = makeJobId(company, title, location);

  // Score using both title AND raw text (so we don't lose Series 7 mentions buried in fluff)
  const scoring = scoreListing(title, rawText);

  return {
    id, title, company, location,
    summary: description,
    applyUrl: j.redirect_url,
    platform: "Adzuna",
    posted: j.created ? formatDate(j.created) : "Recent",
    fit: scoring.fit,
    fitReason: scoring.reason,
    keyMatch: scoring.matches?.slice(0, 4) || [],
    salary,
    scrapedAt: new Date().toISOString(),
  };
}

// === LINKEDIN ===
async function fetchLinkedIn(query, location) {
  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&f_TPR=r86400&start=0`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", "Accept": "text/html,application/xhtml+xml" }
    });
    if (!res.ok) { console.error(`LinkedIn ${res.status} for ${query}`); return []; }
    const html = await res.text();
    return parseLinkedInHTML(html);
  } catch (e) {
    console.error("LinkedIn fetch failed:", e.message);
    return [];
  }
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
      summary: "",
      applyUrl: url,
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
  } catch {
    return "Recent";
  }
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
    console.log(`"${search.query}" in ${search.location}: ${adzunaJobs.length} Adzuna + ${linkedinJobs.length} LinkedIn`);
    allJobs.push(...adzunaJobs, ...linkedinJobs);
  }

  const unique = mergeListings(allJobs);

  // Re-score after merge using descriptions when available
  for (const job of unique) {
    if (job.summary) {
      const rescore = scoreListing(job.title, job.summary);
      job.fit = rescore.fit;
      job.fitReason = rescore.reason;
      job.keyMatch = rescore.matches?.slice(0, 4) || [];
    }
  }

  const fitOrder = { HIGH: 0, MED: 1, LOW: 2 };
  unique.sort((a, b) => {
    const fitDiff = fitOrder[a.fit] - fitOrder[b.fit];
    if (fitDiff !== 0) return fitDiff;
    return (b.scrapedAt || "").localeCompare(a.scrapedAt || "");
  });

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
        withSalary: unique.filter(j => j.salary).length,
        withDescription: unique.filter(j => j.summary).length,
      }
    }),
  };
};

export const handler = schedule("0 12,20 * * *", scrapeHandler);
