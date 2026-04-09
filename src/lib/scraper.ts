import * as cheerio from 'cheerio'

export async function scrapeEmails(url: string): Promise<string[]> {
  const emails = new Set<string>()

  let baseUrl: string
  try {
    baseUrl = new URL(url).origin
  } catch {
    return []
  }

  const pagesToCheck = [
    url,
    `${baseUrl}/contact`,
    `${baseUrl}/contact-us`,
    `${baseUrl}/about`,
    `${baseUrl}/about-us`,
    `${baseUrl}/team`,
    `${baseUrl}/support`,
    `${baseUrl}/info`,
  ]

  for (const pageUrl of pagesToCheck) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const res = await fetch(pageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      })
      clearTimeout(timeout)

      if (!res.ok) continue
      const html = await res.text()

      const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
      const found = html.match(emailRegex) || []
      found.forEach(e => {
        const lower = e.toLowerCase()
        if (
          !lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.endsWith('.gif') &&
          !lower.endsWith('.svg') && !lower.endsWith('.webp') && !lower.endsWith('.css') &&
          !lower.endsWith('.js') && !lower.includes('example.') && !lower.includes('wixpress') &&
          !lower.includes('sentry') && !lower.includes('cloudflare') && !lower.includes('webpack') &&
          !lower.includes('schema.org') && !lower.includes('w3.org') &&
          lower.length < 60
        ) {
          emails.add(lower)
        }
      })

      const $ = cheerio.load(html)
      $('a[href^="mailto:"]').each((_, el) => {
        const href = $(el).attr('href')
        if (href) {
          const email = href.replace('mailto:', '').split('?')[0].trim().toLowerCase()
          if (email.includes('@') && email.length < 60) emails.add(email)
        }
      })

      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const json = JSON.parse($(el).html() || '{}')
          if (json.email) emails.add(json.email.toLowerCase().replace('mailto:', ''))
          if (json.contactPoint?.email) emails.add(json.contactPoint.email.toLowerCase())
        } catch {}
      })
    } catch {
      continue
    }
  }

  return Array.from(emails)
}

interface BusinessResult {
  name: string
  website: string
  phone: string
  address: string
  category: string
}

const BLOCKED_DOMAINS = [
  'google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com',
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'youtube.com', 'linkedin.com', 'pinterest.com', 'tiktok.com',
  'yelp.com', 'tripadvisor.com', 'wikipedia.org', 'amazon.com',
  'reddit.com', 'quora.com', 'medium.com', 'nhs.uk',
  'microsoft.com', 'apple.com', 'bbc.co.uk', 'bbc.com',
]

function isBlockedDomain(url: string): boolean {
  const lower = url.toLowerCase()
  return BLOCKED_DOMAINS.some(d => lower.includes(d))
}

function cleanResult(title: string, link: string, category: string): BusinessResult | null {
  if (!title || !link || !link.startsWith('http') || isBlockedDomain(link)) return null

  let cleanUrl = link
  try {
    cleanUrl = new URL(link).origin
  } catch {
    return null
  }

  return {
    name: title.replace(/ - .*$/, '').replace(/ \| .*$/, '').replace(/\.com$/, '').trim(),
    website: cleanUrl,
    phone: '',
    address: '',
    category,
  }
}

// Primary: SearXNG public instances (designed for programmatic access)
async function searchSearXNG(query: string): Promise<BusinessResult[]> {
  const results: BusinessResult[] = []
  const instances = [
    'https://search.sapti.me',
    'https://searx.tiekoetter.com',
    'https://search.bus-hit.me',
    'https://paulgo.io',
    'https://search.ononoki.org',
  ]
  const category = query.split(' ')[0] || 'business'

  for (const instance of instances) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(
        `${instance}/search?q=${encodeURIComponent(query)}&format=json&categories=general`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
        }
      )
      clearTimeout(timeout)

      if (!res.ok) continue
      const data = await res.json()

      if (data.results && Array.isArray(data.results)) {
        for (const r of data.results) {
          const cleaned = cleanResult(r.title || '', r.url || '', category)
          if (cleaned) results.push(cleaned)
        }
      }

      if (results.length >= 5) break
    } catch {
      continue
    }
  }
  return results
}

// Fallback: DuckDuckGo HTML (POST-based)
async function searchDuckDuckGo(query: string): Promise<BusinessResult[]> {
  const results: BusinessResult[] = []
  const category = query.split(' ')[0] || 'business'
  try {
    const res = await fetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html',
      },
      body: `q=${encodeURIComponent(query + ' official site')}`,
    })
    const html = await res.text()
    const $ = cheerio.load(html)

    $('.result').each((_, el) => {
      const titleEl = $(el).find('.result__a')
      const title = titleEl.text().trim()
      let link = titleEl.attr('href') || ''

      if (link.includes('uddg=')) {
        try {
          const urlParam = new URL(link, 'https://duckduckgo.com').searchParams.get('uddg')
          if (urlParam) link = urlParam
        } catch {}
      }

      const cleaned = cleanResult(title, link, category)
      if (cleaned) results.push(cleaned)
    })
  } catch (err) {
    console.error('DDG error:', err)
  }
  return results
}

// Fallback: Bing
async function searchBing(query: string): Promise<BusinessResult[]> {
  const results: BusinessResult[] = []
  const category = query.split(' ')[0] || 'business'
  try {
    const res = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(query + ' website')}&count=20`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
    })
    const html = await res.text()
    const $ = cheerio.load(html)

    $('li.b_algo').each((_, el) => {
      const titleEl = $(el).find('h2 a')
      const title = titleEl.text().trim()
      const link = titleEl.attr('href') || ''
      const cleaned = cleanResult(title, link, category)
      if (cleaned) results.push(cleaned)
    })
  } catch (err) {
    console.error('Bing error:', err)
  }
  return results
}

// Fallback: Google
async function searchGoogle(query: string): Promise<BusinessResult[]> {
  const results: BusinessResult[] = []
  const category = query.split(' ')[0] || 'business'
  try {
    const res = await fetch(`https://www.google.com/search?q=${encodeURIComponent(query)}&num=20`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
    })
    const html = await res.text()
    const $ = cheerio.load(html)

    $('div.g').each((_, el) => {
      const title = $(el).find('h3').first().text().trim()
      const link = $(el).find('a').first().attr('href') || ''
      const cleaned = cleanResult(title, link, category)
      if (cleaned) results.push(cleaned)
    })
  } catch (err) {
    console.error('Google error:', err)
  }
  return results
}

export async function searchBusinesses(query: string): Promise<BusinessResult[]> {
  // Try all sources, combine results
  const [searxResults, ddgResults, bingResults, googleResults] = await Promise.allSettled([
    searchSearXNG(query),
    searchDuckDuckGo(query),
    searchBing(query),
    searchGoogle(query),
  ])

  const all: BusinessResult[] = [
    ...(searxResults.status === 'fulfilled' ? searxResults.value : []),
    ...(ddgResults.status === 'fulfilled' ? ddgResults.value : []),
    ...(bingResults.status === 'fulfilled' ? bingResults.value : []),
    ...(googleResults.status === 'fulfilled' ? googleResults.value : []),
  ]

  // Deduplicate by domain
  const seen = new Set<string>()
  const unique: BusinessResult[] = []
  for (const r of all) {
    const domain = r.website.replace(/https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '').toLowerCase()
    if (!seen.has(domain)) {
      seen.add(domain)
      unique.push(r)
    }
  }

  return unique.slice(0, 20)
}
