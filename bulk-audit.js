#!/usr/bin/env node

/**
 * BULK WEBSITE AUDITOR + EMAIL GENERATOR
 *
 * Usage:
 *   1. Create a file called "targets.txt" with one website per line
 *   2. Run: node bulk-audit.js
 *   3. Get ready-to-send emails for each business
 *
 * targets.txt format:
 *   Business Name | https://website.com | email@business.com
 *   Another Biz | https://another.com | info@another.com
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

const TARGETS_FILE = path.join(__dirname, 'targets.txt');
const OUTPUT_FILE = path.join(__dirname, `emails-${new Date().toISOString().slice(0,10)}.txt`);

function fetchUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
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

async function auditWebsite(url) {
  const issues = [];
  const scores = { speed: 0, mobile: 0, seo: 0, ssl: 0, overall: 0 };

  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);

    scores.ssl = parsed.protocol === 'https:' ? 100 : 0;
    if (scores.ssl === 0) issues.push("No SSL — site shows 'Not Secure' warning");

    const start = Date.now();
    const html = await fetchUrl(parsed.href);
    const loadTime = Date.now() - start;

    if (!html) {
      issues.push("Website is DOWN or unreachable");
      scores.overall = 0;
      return { issues, scores, loadTime: 0 };
    }

    // Speed
    if (loadTime > 5000) { scores.speed = 20; issues.push(`Very slow (${(loadTime/1000).toFixed(1)}s) — visitors leave after 3s`); }
    else if (loadTime > 3000) { scores.speed = 50; issues.push(`Slow load (${(loadTime/1000).toFixed(1)}s) — should be under 2s`); }
    else if (loadTime > 1500) { scores.speed = 75; }
    else { scores.speed = 95; }

    // Mobile
    if (!html.includes('viewport')) { scores.mobile = 20; issues.push("Not mobile-friendly — 60%+ visitors use phones"); }
    else { scores.mobile = 80; }

    // SEO
    let seo = 0;
    if (!html.match(/<title[^>]*>.+<\/title>/i)) issues.push("Missing page title — invisible to Google");
    else seo += 25;
    if (!html.match(/<meta[^>]*description/i)) issues.push("Missing meta description — ugly Google preview");
    else seo += 25;
    if (!html.match(/<h1/i)) issues.push("Missing H1 heading — bad SEO");
    else seo += 25;
    if (!html.match(/og:image|og:title/i)) issues.push("No social media preview tags");
    else seo += 25;
    scores.seo = seo;

    // Extra checks
    if (!html.match(/gtag|analytics|gtm/i)) issues.push("No analytics — no idea how visitors behave");
    if (html.length < 5000) issues.push("Very minimal content — not enough to convert visitors");

    scores.overall = Math.round((scores.speed + scores.mobile + scores.seo + scores.ssl) / 4);
    return { issues, scores, loadTime };
  } catch (e) {
    issues.push("Could not reach website");
    return { issues, scores, loadTime: 0 };
  }
}

function generateEmail(name, email, url, audit) {
  const top3 = audit.issues.slice(0, 3).map((issue, i) => `${i + 1}. ${issue}`).join('\n');

  return `TO: ${email}
SUBJECT: I found ${audit.issues.length} issues on ${name}'s website (free audit inside)

Hi${name ? ' ' + name.split(' ')[0] : ''},

I was browsing ${name || 'your website'} and ran a quick audit. Here's what I found:

${top3}

Overall score: ${audit.scores.overall}/100 (most successful businesses score 80+).

I run Customation — we help businesses like yours get a professional online presence that actually brings in customers.

I'd love to send you a FREE detailed mockup showing what an improved version could look like. Takes us about 30 minutes to put together, zero cost to you.

Interested?

Best,
Mubashir Khan
Customation — Premium Design & Tech
https://customation-next-oajw.vercel.app
WhatsApp: +92 307 674 8102
`;
}

async function main() {
  // Check if targets file exists
  if (!fs.existsSync(TARGETS_FILE)) {
    // Create sample file
    fs.writeFileSync(TARGETS_FILE, `# Add businesses to audit (one per line)
# Format: Business Name | https://website.com | email@business.com
#
# Example:
# Pizza Palace | https://pizzapalace.pk | info@pizzapalace.pk
# Khan Salon | https://khansalon.com | contact@khansalon.com
#
# Find businesses on Google Maps, copy their website and email
# Then run: node bulk-audit.js
`);
    console.log("\n📝 Created targets.txt — add your businesses there, then run again.\n");
    console.log("Format: Business Name | https://website.com | email@business.com");
    console.log("One business per line.\n");
    return;
  }

  const lines = fs.readFileSync(TARGETS_FILE, 'utf-8').split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));

  if (lines.length === 0) {
    console.log("\n⚠️  targets.txt is empty. Add businesses and run again.\n");
    return;
  }

  console.log(`\n🚀 Auditing ${lines.length} businesses...\n`);

  const allEmails = [];

  for (const line of lines) {
    const parts = line.split('|').map(p => p.trim());
    const name = parts[0] || 'Business';
    const website = parts[1] || '';
    const email = parts[2] || '';

    if (!website) { console.log(`⏭  Skipping "${name}" — no website`); continue; }

    process.stdout.write(`🔍 ${name}... `);
    const audit = await auditWebsite(website);
    console.log(`Score: ${audit.scores.overall}/100 | ${audit.issues.length} issues`);

    if (audit.issues.length > 0) {
      const emailText = generateEmail(name, email, website, audit);
      allEmails.push(emailText);
      console.log(`   Top issues:`);
      audit.issues.slice(0, 2).forEach(i => console.log(`   ❌ ${i}`));
    } else {
      console.log(`   ✅ Website looks good — skip this one`);
    }
  }

  // Save all emails
  if (allEmails.length > 0) {
    fs.writeFileSync(OUTPUT_FILE, allEmails.join('\n' + '═'.repeat(60) + '\n\n'));
    console.log(`\n✅ ${allEmails.length} personalized emails saved to ${OUTPUT_FILE}`);
    console.log(`\n📧 Open the file and copy-paste each email to send!\n`);
  } else {
    console.log("\n😅 No issues found on any website. Try different businesses.\n");
  }
}

main().catch(console.error);
