// netlify/functions/fetch-jobs.js
// Scheduled function — scrapes Indeed RSS + LinkedIn guest API, scores against profile

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

function cleanDescription(text, maxLength = 500) {
  if (!text) return "";
  let cleaned = text
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
  if (cleaned.length > maxLength) {
    const truncated = cleaned.slice(0, maxLength);
    const lastPeriod = truncated.lastIndexOf(".");
    cleaned = lastPeriod > maxLength * 0.6
      ? truncated.slice(0, lastPeriod + 1)
      : truncated + "...";
  }
  return cleaned;
}

async function fetchIndeed(query, location) {
  const url = `https://www.indeed.com/rss?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}&fromage=3&sort=date`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JobTracker/1.0)", "Accept": "application/rss+xml,application/xml,text/xml" }
    });
    if (!res.ok) { console.error(`Indeed RSS ${res.status} for ${query}`); return []; }
    const xml = await res.text();
    return parseIndeedRSS(xml);
  } catch (e) {
    console.error("Indeed fetch failed:", e.message);
    return [];
  }
}

function parseIndeedRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const fieldRegex = (field) => new RegExp(`<${field}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${field}>`);
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const titleMatch = item.match(fieldRegex("title"));
    const linkMatch = item.match(fieldRegex("link"));
    const descMatch = item.match(fieldRegex("description"));
    const dateMatch = item.match(fieldRegex("pubDate"));
    if (!titleMatch || !linkMatch) continue;
    const fullTitle = titleMatch[1].trim();
    const parts = fullTitle.split(" - ");
    const title = parts[0]?.trim() || fullTitle;
    const company = parts[1]?.trim() || "Unknown";
    const location = parts.slice(2).join(" - ").trim() || "";
    const rawDesc = descMatch?.[1] || "";
    const description = cleanDescription(rawDesc, 500);
    const salary = extractSalary(rawDesc);
    const url = linkMatch[1].trim();
    const id = makeJobId(company, title, location);
    const scoring = scoreListing(title, description);
    items.push({
      id, title, company, location,
      summary: description, applyUrl: url,
      platform: "Indeed",
      posted: dateMatch ? formatDate(dateMatch[1]) : "Recent",
      fit: scoring.fit, fitReason: scoring.reason,
      keyMatch: scoring.matches?.slice(0, 4) || [],
      salary, scrapedAt: new Date().toISOString(),
    });
  }
  return items;
}

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
    const title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
    const company = (companyMatch?.[1] || "").replace(/<[^>]+>/g, "").trim() || "Unknown";
    const location = (locationMatch?.[1] || "").replace(/<[^>]+>/g, "").trim();
    const url = linkMatch[1].split("?")[0];
    const rawSalaryText = (salaryMatch?.[1] || "").replace(/<[^>]+>/g, "").trim();
    const salary = rawSalaryText
      ? rawSalaryText.replace(/\s+/g, " ").slice(0, 50)
      : extractSalary(rawSalaryText);
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
  } catch {
    return "Recent";
  }
}

const scrapeHandler = async (event, context) => {
  console.log("Job scraper running at", new Date().toISOString());
  const allJobs = [];
  const seenIds = new Set();
  for (const search of SEARCHES) {
    const [indeedJobs, linkedinJobs] = await Promise.all([
      fetchIndeed(search.query, search.location),
      fetchLinkedIn(search.query, search.location),
    ]);
    for (const job of [...indeedJobs, ...linkedinJobs]) {
      if (!seenIds.has(job.id)) {
        seenIds.add(job.id);
        allJobs.push(job);
      }
    }
  }
  const fitOrder = { HIGH: 0, MED: 1, LOW: 2 };
  allJobs.sort((a, b) => {
    const fitDiff = fitOrder[a.fit] - fitOrder[b.fit];
    if (fitDiff !== 0) return fitDiff;
    return (b.scrapedAt || "").localeCompare(a.scrapedAt || "");
  });
  console.log(`Returning ${allJobs.length} unique listings`);
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      jobs: allJobs,
      lastUpdated: new Date().toISOString(),
      counts: {
        total: allJobs.length,
        high: allJobs.filter(j => j.fit === "HIGH").length,
        med: allJobs.filter(j => j.fit === "MED").length,
        low: allJobs.filter(j => j.fit === "LOW").length,
      }
    }),
  };
};

export const handler = schedule("0 12,20 * * *", scrapeHandler);
