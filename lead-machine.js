#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  CUSTOMATION LEAD MACHINE
 *  Automated Lead Generation + Website Auditor + Email Sender
 * ═══════════════════════════════════════════════════════════════
 *
 *  Commands:
 *    node lead-machine.js scrape "restaurants karachi"     → Find businesses from Google
 *    node lead-machine.js audit                            → Audit all businesses in leads.json
 *    node lead-machine.js email                            → Generate & send cold emails
 *    node lead-machine.js dashboard                        → Show stats
 *    node lead-machine.js run "restaurants karachi"         → Full pipeline: scrape → audit → email
 */

const https = require("https");
const http = require("http");
const { URL } = require("url");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const cheerio = require("cheerio");

// ── Config ──
const CONFIG = {
  senderEmail: "kmubashir182@gmail.com",
  senderName: "Mubashir Khan",
  companyName: "Customation",
  companyUrl: "https://customation-next-oajw.vercel.app",
  whatsapp: "+92 307 674 8102",
  leadsFile: path.join(__dirname, "leads.json"),
  sentFile: path.join(__dirname, "sent.json"),
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD || "", // Set this!
};

// ── Helpers ──
function loadJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return []; }
}
function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function fetchUrl(url, timeout = 12000) {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith("https") ? https : http;
      const req = client.get(url, {
        timeout,
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const loc = res.headers.location;
          const full = loc.startsWith("http") ? loc : new URL(loc, url).href;
          fetchUrl(full, timeout).then(resolve);
          return;
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      });
      req.on("error", () => resolve(null));
      req.on("timeout", () => { req.destroy(); resolve(null); });
    } catch { resolve(null); }
  });
}

// ═══════════════════════════════════════════════════════════════
// 1. SCRAPER - Find businesses from Google
// ═══════════════════════════════════════════════════════════════
async function scrapeBusinesses(query) {
  console.log(`\n🔍 Searching Google for: "${query}"\n`);

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20`;
  const html = await fetchUrl(searchUrl);

  if (!html) {
    console.log("❌ Could not reach Google. Try again or use manual mode.\n");
    console.log("📋 MANUAL MODE: Add businesses to leads.json manually:");
    console.log('   [{"name":"Biz Name","website":"https://...","email":"info@...","phone":"..."}]\n');
    return [];
  }

  const $ = cheerio.load(html);
  const businesses = [];
  const seen = new Set();

  // Extract links and business info from search results
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    // Extract actual URLs from Google redirect
    const match = href.match(/url\?q=(https?:\/\/[^&]+)/);
    if (match) {
      const url = decodeURIComponent(match[1]);
      const domain = new URL(url).hostname;
      // Skip known non-business sites
      if (domain.includes("google") || domain.includes("youtube") || domain.includes("facebook") ||
          domain.includes("instagram") || domain.includes("twitter") || domain.includes("linkedin") ||
          domain.includes("wikipedia") || domain.includes("yelp") || domain.includes("tripadvisor") ||
          domain.includes("justdial") || domain.includes("zomato") || domain.includes("foodpanda")) return;
      if (seen.has(domain)) return;
      seen.add(domain);
      businesses.push({
        name: domain.replace(/^www\./, "").split(".")[0],
        website: url,
        email: "",
        phone: "",
        status: "new",
        score: null,
        issues: [],
        emailSent: false,
        addedAt: new Date().toISOString(),
      });
    }
  });

  // Also try to find business names from text
  $("h3").each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 3 && text.length < 100) {
      const parent = $(el).closest("a");
      const href = parent.attr("href") || "";
      const match = href.match(/url\?q=(https?:\/\/[^&]+)/);
      if (match) {
        const url = decodeURIComponent(match[1]);
        const domain = new URL(url).hostname;
        const existing = businesses.find(b => b.website === url);
        if (existing) existing.name = text;
      }
    }
  });

  console.log(`📊 Found ${businesses.length} businesses\n`);
  businesses.forEach((b, i) => console.log(`  ${i + 1}. ${b.name} → ${b.website}`));

  // Merge with existing leads
  const existing = loadJson(CONFIG.leadsFile);
  const existingUrls = new Set(existing.map((l) => l.website));
  const newLeads = businesses.filter((b) => !existingUrls.has(b.website));
  const all = [...existing, ...newLeads];
  saveJson(CONFIG.leadsFile, all);

  console.log(`\n✅ ${newLeads.length} new leads added (${all.length} total)\n`);
  return newLeads;
}

// ═══════════════════════════════════════════════════════════════
// 2. AUDITOR - Check websites for issues
// ═══════════════════════════════════════════════════════════════
async function auditWebsite(url) {
  const issues = [];
  const scores = { speed: 0, mobile: 0, seo: 0, ssl: 0, design: 0, overall: 0 };

  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    scores.ssl = parsed.protocol === "https:" ? 100 : 0;
    if (!scores.ssl) issues.push("❌ No SSL certificate — shows 'Not Secure' to every visitor");

    const start = Date.now();
    const html = await fetchUrl(parsed.href);
    const loadTime = Date.now() - start;

    if (!html) {
      issues.push("❌ Website is completely DOWN or unreachable");
      return { issues, scores: { ...scores, overall: 0 }, loadTime: 0, emailsFound: [] };
    }

    const $ = cheerio.load(html);

    // Speed
    if (loadTime > 5000) { scores.speed = 15; issues.push(`❌ Extremely slow (${(loadTime / 1000).toFixed(1)}s) — 53% of visitors leave after 3 seconds`); }
    else if (loadTime > 3000) { scores.speed = 40; issues.push(`⚠️ Slow load time (${(loadTime / 1000).toFixed(1)}s) — should be under 2 seconds for best results`); }
    else if (loadTime > 1500) { scores.speed = 70; }
    else { scores.speed = 95; }

    // Mobile
    if (!html.includes("viewport")) { scores.mobile = 15; issues.push("❌ Not mobile-friendly — over 60% of your visitors are on phones and seeing a broken layout"); }
    else { scores.mobile = 85; }

    // SEO
    let seo = 0;
    const title = $("title").text().trim();
    if (!title) { issues.push("❌ Missing page title — Google can't properly index your site"); } else seo += 20;
    if (!$('meta[name="description"]').attr("content")) { issues.push("❌ Missing meta description — your Google listing looks empty and unprofessional"); } else seo += 20;
    if ($("h1").length === 0) { issues.push("⚠️ No H1 heading — hurts your Google search ranking"); } else seo += 20;
    if (!html.match(/og:image|og:title/i)) { issues.push("⚠️ No social media preview — links shared on WhatsApp/Facebook look plain"); } else seo += 20;
    if (!html.match(/canonical/i)) { issues.push("⚠️ No canonical URL — can cause duplicate content issues with Google"); } else seo += 20;
    scores.seo = seo;

    // Design quality
    let design = 50;
    if (!html.match(/font-family|google.*fonts|typekit|fonts\.googleapis/i)) { issues.push("⚠️ Using default browser fonts — looks unprofessional"); design -= 15; }
    if (html.length < 5000) { issues.push("⚠️ Very minimal content — not enough to convince visitors to buy"); design -= 15; }
    if (!html.match(/gtag|analytics|gtm|pixel/i)) { issues.push("❌ No analytics — you have zero visibility into your website traffic"); design -= 10; }
    const imgCount = $("img").length;
    if (imgCount === 0) { issues.push("⚠️ No images — makes the site look empty and untrustworthy"); design -= 10; }
    scores.design = Math.max(0, design);

    // Try to find emails on the page
    const emailsFound = [];
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = html.match(emailRegex) || [];
    matches.forEach((e) => {
      if (!e.includes("example") && !e.includes("wixpress") && !e.includes("sentry") && !emailsFound.includes(e)) {
        emailsFound.push(e);
      }
    });

    // Try to find phone numbers
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
    const phones = html.match(phoneRegex) || [];

    // Overall
    scores.overall = Math.round((scores.speed + scores.mobile + scores.seo + scores.ssl + scores.design) / 5);

    return { issues, scores, loadTime, emailsFound, phones: phones.slice(0, 3) };
  } catch (e) {
    issues.push("❌ Could not analyze: " + e.message);
    return { issues, scores, loadTime: 0, emailsFound: [] };
  }
}

async function auditAllLeads() {
  const leads = loadJson(CONFIG.leadsFile);
  if (leads.length === 0) {
    console.log("\n⚠️  No leads found. Run 'scrape' first.\n");
    return;
  }

  console.log(`\n🔍 Auditing ${leads.length} websites...\n`);

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    if (lead.score !== null && lead.score !== undefined) {
      console.log(`⏭  ${lead.name} — already audited (${lead.score}/100)`);
      continue;
    }

    process.stdout.write(`[${i + 1}/${leads.length}] ${lead.name}... `);
    const audit = await auditWebsite(lead.website);

    lead.score = audit.scores.overall;
    lead.issues = audit.issues;
    lead.loadTime = audit.loadTime;
    if (audit.emailsFound?.length > 0 && !lead.email) {
      lead.email = audit.emailsFound[0];
    }
    if (audit.phones?.length > 0 && !lead.phone) {
      lead.phone = audit.phones[0];
    }

    console.log(`Score: ${lead.score}/100 | ${lead.issues.length} issues${lead.email ? ` | 📧 ${lead.email}` : ""}`);

    // Save after each audit (in case of crash)
    saveJson(CONFIG.leadsFile, leads);

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Summary
  const lowScore = leads.filter((l) => l.score !== null && l.score < 60);
  const withEmail = leads.filter((l) => l.email);
  console.log(`\n📊 AUDIT SUMMARY:`);
  console.log(`   Total leads: ${leads.length}`);
  console.log(`   Low score (<60): ${lowScore.length} — BEST TARGETS`);
  console.log(`   With email: ${withEmail.length} — ready to contact`);
  console.log(`\n✅ Results saved to leads.json\n`);
}

// ═══════════════════════════════════════════════════════════════
// 3. EMAIL GENERATOR + SENDER
// ═══════════════════════════════════════════════════════════════
function generateEmailContent(lead) {
  const top3 = lead.issues.slice(0, 3).join("\n");
  const name = lead.name.charAt(0).toUpperCase() + lead.name.slice(1);

  const subject = `Quick question about ${name}'s website`;

  const body = `Hi,

I came across ${name} and decided to run a quick website audit. I found a few things that might be costing you customers:

${top3}

Your site scored ${lead.score}/100 overall. Most businesses that rank well on Google score 80+.

I'm Mubashir from Customation — we help businesses get a professional online presence that actually brings in customers. We've done this for 50+ businesses across 20+ countries.

I'd love to put together a FREE mockup showing what an improved version of your site could look like. Takes us about an hour, zero cost to you.

Would you be interested?

Best regards,
Mubashir Khan
Customation — Premium Design & Tech Solutions
${CONFIG.companyUrl}
WhatsApp: ${CONFIG.whatsapp}

P.S. We offer a 14-day satisfaction guarantee on all our work. If you don't love it, you don't pay.`;

  return { subject, body };
}

async function sendEmails(dryRun = true) {
  const leads = loadJson(CONFIG.leadsFile);
  const sent = loadJson(CONFIG.sentFile);
  const sentEmails = new Set(sent.map((s) => s.email));

  // Filter: has email, low score, not already sent
  const targets = leads.filter(
    (l) => l.email && l.score !== null && l.score < 75 && !l.emailSent && !sentEmails.has(l.email)
  );

  if (targets.length === 0) {
    console.log("\n⚠️  No targets ready. Either no emails found or all already contacted.\n");
    console.log("   Run 'scrape' to find more businesses, or add emails manually to leads.json\n");
    return;
  }

  console.log(`\n📧 ${dryRun ? "PREVIEW" : "SENDING"} emails to ${targets.length} businesses:\n`);

  let transporter = null;
  if (!dryRun) {
    if (!CONFIG.gmailAppPassword) {
      console.log("❌ Gmail App Password not set!");
      console.log("   1. Go to https://myaccount.google.com/apppasswords");
      console.log("   2. Generate an App Password for 'Mail'");
      console.log("   3. Run: GMAIL_APP_PASSWORD=xxxx node lead-machine.js email send\n");
      return;
    }
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: CONFIG.senderEmail, pass: CONFIG.gmailAppPassword },
    });
  }

  for (const lead of targets) {
    const { subject, body } = generateEmailContent(lead);

    console.log(`${"─".repeat(50)}`);
    console.log(`📧 To: ${lead.email} (${lead.name})`);
    console.log(`📝 Subject: ${subject}`);
    console.log(`📊 Score: ${lead.score}/100 | Issues: ${lead.issues.length}`);

    if (dryRun) {
      console.log(`\n${body}\n`);
    } else {
      try {
        await transporter.sendMail({
          from: `"${CONFIG.senderName} @ ${CONFIG.companyName}" <${CONFIG.senderEmail}>`,
          to: lead.email,
          subject,
          text: body,
        });
        lead.emailSent = true;
        lead.emailSentAt = new Date().toISOString();
        sent.push({ email: lead.email, name: lead.name, sentAt: lead.emailSentAt });
        console.log(`   ✅ SENT!`);

        // Wait between emails to avoid spam filters
        await new Promise((r) => setTimeout(r, 3000));
      } catch (e) {
        console.log(`   ❌ Failed: ${e.message}`);
      }
    }
  }

  if (!dryRun) {
    saveJson(CONFIG.leadsFile, leads);
    saveJson(CONFIG.sentFile, sent);
    console.log(`\n✅ ${targets.filter((t) => t.emailSent).length} emails sent!\n`);
  } else {
    console.log(`\n📋 ${targets.length} emails previewed. To actually send, run:`);
    console.log(`   GMAIL_APP_PASSWORD=xxxx node lead-machine.js email send\n`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 4. DASHBOARD
// ═══════════════════════════════════════════════════════════════
function showDashboard() {
  const leads = loadJson(CONFIG.leadsFile);
  const sent = loadJson(CONFIG.sentFile);

  console.log(`
╔══════════════════════════════════════════════════════╗
║         CUSTOMATION LEAD MACHINE — DASHBOARD        ║
╠══════════════════════════════════════════════════════╣
║  Total Leads:     ${String(leads.length).padStart(5)}                           ║
║  Audited:         ${String(leads.filter((l) => l.score !== null).length).padStart(5)}                           ║
║  With Email:      ${String(leads.filter((l) => l.email).length).padStart(5)}                           ║
║  Emails Sent:     ${String(sent.length).padStart(5)}                           ║
║  Low Score (<60): ${String(leads.filter((l) => l.score !== null && l.score < 60).length).padStart(5)}  ← HOT TARGETS            ║
╠══════════════════════════════════════════════════════╣
║  Score Distribution:                                ║
║  🔴 0-30:  ${String(leads.filter((l) => l.score !== null && l.score <= 30).length).padStart(4)} (terrible — easy sell!)             ║
║  🟠 31-50: ${String(leads.filter((l) => l.score !== null && l.score > 30 && l.score <= 50).length).padStart(4)} (bad — good target)                ║
║  🟡 51-70: ${String(leads.filter((l) => l.score !== null && l.score > 50 && l.score <= 70).length).padStart(4)} (mediocre — potential)              ║
║  🟢 71+:   ${String(leads.filter((l) => l.score !== null && l.score > 70).length).padStart(4)} (decent — skip these)              ║
╚══════════════════════════════════════════════════════╝
`);

  // Show top 10 worst websites (best targets)
  const worst = leads
    .filter((l) => l.score !== null)
    .sort((a, b) => a.score - b.score)
    .slice(0, 10);

  if (worst.length > 0) {
    console.log("🎯 TOP TARGETS (worst websites = easiest sell):\n");
    worst.forEach((l, i) => {
      console.log(`  ${i + 1}. ${l.name} — Score: ${l.score}/100 ${l.email ? `📧 ${l.email}` : "❌ no email"} ${l.emailSent ? "✅ sent" : ""}`);
    });
    console.log("");
  }
}

// ═══════════════════════════════════════════════════════════════
// 5. FULL PIPELINE
// ═══════════════════════════════════════════════════════════════
async function fullPipeline(query) {
  console.log("\n🚀 RUNNING FULL LEAD PIPELINE\n");
  console.log("Step 1: Scraping businesses...");
  await scrapeBusinesses(query);
  console.log("Step 2: Auditing websites...");
  await auditAllLeads();
  console.log("Step 3: Generating emails...");
  await sendEmails(true); // dry run first
  console.log("Step 4: Dashboard...");
  showDashboard();
}

// ═══════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════
const command = process.argv[2];
const arg = process.argv.slice(3).join(" ");

switch (command) {
  case "scrape":
    scrapeBusinesses(arg || "restaurants karachi").catch(console.error);
    break;
  case "audit":
    auditAllLeads().catch(console.error);
    break;
  case "email":
    sendEmails(arg !== "send").catch(console.error);
    break;
  case "dashboard":
    showDashboard();
    break;
  case "run":
    fullPipeline(arg || "restaurants karachi").catch(console.error);
    break;
  default:
    console.log(`
╔══════════════════════════════════════════════════════╗
║       CUSTOMATION LEAD MACHINE                      ║
║       Automated Lead Generation System              ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  Commands:                                           ║
║                                                      ║
║  node lead-machine.js scrape "restaurants karachi"   ║
║    → Find businesses from Google search              ║
║                                                      ║
║  node lead-machine.js audit                          ║
║    → Audit all websites in leads.json                ║
║                                                      ║
║  node lead-machine.js email                          ║
║    → Preview cold emails for low-score sites         ║
║                                                      ║
║  node lead-machine.js email send                     ║
║    → Actually send the emails (needs Gmail password) ║
║                                                      ║
║  node lead-machine.js dashboard                      ║
║    → Show lead stats and top targets                 ║
║                                                      ║
║  node lead-machine.js run "salons dubai"             ║
║    → Full pipeline: scrape → audit → email → stats   ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
    `);
}
