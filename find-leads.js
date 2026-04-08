#!/usr/bin/env node

/**
 * CUSTOMATION LEAD FINDER
 *
 * Finds businesses from Google, checks their websites for issues,
 * and generates personalized cold emails ready to send.
 *
 * Usage: node find-leads.js "restaurants karachi"
 *        node find-leads.js "salon dubai"
 *        node find-leads.js "publishing house"
 *        node find-leads.js "gym lahore"
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');

const SEARCH_QUERY = process.argv[2] || "restaurants karachi";
const OUTPUT_FILE = `leads-${Date.now()}.json`;

// ── Website Audit ──
async function auditWebsite(url) {
  const issues = [];
  const scores = { speed: 0, mobile: 0, seo: 0, ssl: 0, overall: 0 };

  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);

    // Check SSL
    if (parsed.protocol === 'https:') {
      scores.ssl = 100;
    } else {
      scores.ssl = 0;
      issues.push("No SSL certificate (site is not secure - shows 'Not Secure' warning to visitors)");
    }

    // Check if site loads
    const start = Date.now();
    const html = await fetchUrl(parsed.href);
    const loadTime = Date.now() - start;

    if (!html) {
      issues.push("Website is DOWN or unreachable");
      return { url: parsed.href, issues, scores, loadTime: 0, suggestions: ["Website needs to be rebuilt from scratch"] };
    }

    // Speed check
    if (loadTime > 5000) {
      scores.speed = 20;
      issues.push(`Extremely slow load time (${(loadTime/1000).toFixed(1)}s) — visitors leave after 3 seconds`);
    } else if (loadTime > 3000) {
      scores.speed = 50;
      issues.push(`Slow load time (${(loadTime/1000).toFixed(1)}s) — should be under 2 seconds`);
    } else if (loadTime > 1500) {
      scores.speed = 75;
    } else {
      scores.speed = 95;
    }

    // Mobile check
    if (!html.includes('viewport')) {
      scores.mobile = 20;
      issues.push("Not mobile-friendly — no viewport meta tag (60%+ of visitors use phones)");
    } else {
      scores.mobile = 80;
    }

    // SEO checks
    let seoScore = 0;
    if (!html.match(/<title[^>]*>.+<\/title>/i)) {
      issues.push("Missing page title — hurts Google rankings");
    } else seoScore += 25;

    if (!html.match(/<meta[^>]*description/i)) {
      issues.push("Missing meta description — Google shows ugly preview in search results");
    } else seoScore += 25;

    if (!html.match(/<h1/i)) {
      issues.push("Missing H1 heading — bad for SEO structure");
    } else seoScore += 25;

    if (!html.match(/og:image|og:title/i)) {
      issues.push("Missing social media preview tags — links shared on social look plain");
    } else seoScore += 25;

    scores.seo = seoScore;

    // Design checks
    if (html.includes('wordpress') || html.includes('wp-content')) {
      if (html.includes('flavor') || html.includes('flavor') || html.includes('flavor')) {
        issues.push("Using a generic WordPress template — looks like every other site");
      }
    }

    if (!html.match(/font-family|google.*fonts|typekit/i)) {
      issues.push("Using default browser fonts — looks unprofessional");
    }

    if (html.length < 5000) {
      issues.push("Very minimal website content — needs more information to convert visitors");
    }

    // Analytics check
    if (!html.match(/gtag|analytics|ga\.js|gtm/i)) {
      issues.push("No analytics tracking — you have no idea how many visitors you get or what they do");
    }

    // Overall score
    scores.overall = Math.round((scores.speed + scores.mobile + scores.seo + scores.ssl) / 4);

    // Generate suggestions
    const suggestions = [];
    if (scores.overall < 50) suggestions.push("Complete website redesign recommended");
    if (scores.speed < 60) suggestions.push("Website speed optimization needed");
    if (scores.mobile < 60) suggestions.push("Mobile-responsive redesign needed");
    if (scores.seo < 60) suggestions.push("SEO overhaul needed");
    if (scores.ssl === 0) suggestions.push("SSL certificate installation needed");

    return { url: parsed.href, issues, scores, loadTime, suggestions };
  } catch (e) {
    issues.push("Could not analyze website: " + e.message);
    return { url, issues, scores, loadTime: 0, suggestions: ["Website needs professional review"] };
  }
}

function fetchUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchUrl(res.headers.location).then(resolve);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// ── Email Generator ──
function generateEmail(business, audit) {
  const issuesList = audit.issues.slice(0, 3).map((issue, i) => `${i + 1}. ${issue}`).join('\n');

  return `Subject: I found ${audit.issues.length} issues with ${business.name || 'your'} website

Hi${business.name ? ' ' + business.name.split(' ')[0] : ''},

I came across ${business.name || 'your business'} and noticed your website has a few issues that could be costing you customers:

${issuesList}

Your site scores ${audit.scores.overall}/100 overall. For reference, most successful businesses score 80+.

I run Customation, a design & tech agency. We specialize in fixing exactly these issues — fast websites, modern design, and SEO that actually ranks.

I'd love to do a FREE detailed audit and show you a quick mockup of what an improved version could look like. No strings attached.

Want me to send it over?

Best,
Mubashir Khan
Customation — Premium Design & Tech
https://customation-next-oajw.vercel.app
WhatsApp: +92 307 674 8102`;
}

// ── Main ──
async function main() {
  console.log(`\n🔍 Searching for: "${SEARCH_QUERY}"\n`);
  console.log("Note: For best results, manually find businesses on Google Maps");
  console.log("and add their websites to a text file, then audit them.\n");
  console.log("─".repeat(60));

  // Sample businesses to audit - replace with real ones you find
  const sampleBusinesses = [
    // ADD YOUR TARGET BUSINESSES HERE
    // { name: "Restaurant Name", website: "https://their-website.com", email: "info@their-website.com" },
  ];

  // If no businesses defined, show instructions
  if (sampleBusinesses.length === 0) {
    console.log("\n📋 HOW TO USE THIS TOOL:\n");
    console.log("1. Go to Google Maps, search for businesses");
    console.log("2. Find ones with websites");
    console.log("3. Edit this file and add them to sampleBusinesses array:");
    console.log("");
    console.log('   { name: "Pizza Place", website: "https://pizzaplace.com", email: "info@pizzaplace.com" }');
    console.log("");
    console.log("4. Run again: node find-leads.js");
    console.log("");
    console.log("Or use the quick audit mode:\n");
    console.log("   node find-leads.js audit https://some-website.com\n");

    // Quick audit mode
    if (process.argv[2] === 'audit' && process.argv[3]) {
      const url = process.argv[3];
      console.log(`\n🔍 Auditing: ${url}\n`);
      const audit = await auditWebsite(url);

      console.log(`📊 Overall Score: ${audit.scores.overall}/100`);
      console.log(`⚡ Speed: ${audit.scores.speed}/100 (${audit.loadTime}ms)`);
      console.log(`📱 Mobile: ${audit.scores.mobile}/100`);
      console.log(`🔍 SEO: ${audit.scores.seo}/100`);
      console.log(`🔒 SSL: ${audit.scores.ssl}/100`);
      console.log(`\n❌ Issues Found (${audit.issues.length}):`);
      audit.issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
      console.log(`\n✅ Suggestions:`);
      audit.suggestions.forEach(s => console.log(`   • ${s}`));

      console.log("\n📧 Generated Email:\n");
      console.log("─".repeat(60));
      console.log(generateEmail({ name: url.replace(/https?:\/\//, '').split('/')[0] }, audit));
      console.log("─".repeat(60));
    }
    return;
  }

  // Audit each business
  const results = [];
  for (const biz of sampleBusinesses) {
    console.log(`\n🔍 Auditing: ${biz.name} (${biz.website})`);
    const audit = await auditWebsite(biz.website);

    console.log(`   Score: ${audit.scores.overall}/100 | Issues: ${audit.issues.length}`);
    audit.issues.slice(0, 3).forEach(i => console.log(`   ❌ ${i}`));

    const email = generateEmail(biz, audit);
    results.push({ ...biz, audit, email });
  }

  // Save results
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`\n✅ ${results.length} leads saved to ${OUTPUT_FILE}`);

  // Show emails
  console.log("\n📧 READY-TO-SEND EMAILS:\n");
  results.forEach((r, i) => {
    console.log(`═══ Lead ${i + 1}: ${r.name} (Score: ${r.audit.scores.overall}/100) ═══`);
    console.log(r.email);
    console.log("");
  });
}

main().catch(console.error);
