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
      const html = await fetchWithProxies(pageUrl)
      if (!html) continue

      const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
      const found = html.match(emailRegex) || []
      found.forEach(e => {
        const lower = e.toLowerCase()
        if (
          !lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.endsWith('.gif') &&
          !lower.endsWith('.svg') && !lower.endsWith('.webp') && !lower.endsWith('.css') &&
          !lower.endsWith('.js') && !lower.includes('example.') && !lower.includes('wixpress') &&
          !lower.includes('sentry') && !lower.includes('cloudflare') && !lower.includes('webpack') &&
          !lower.includes('schema.org') && !lower.includes('w3.org') && !lower.includes('googleapis') &&
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

// Fetch URL using free proxy services to bypass IP blocks
async function fetchWithProxies(url: string, timeoutMs = 10000): Promise<string | null> {
  // Try direct first
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })
    clearTimeout(timeout)
    if (res.ok) return await res.text()
  } catch {}

  // Try proxies
  const proxies = [
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  ]

  for (const proxyFn of proxies) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      const res = await fetch(proxyFn(url), {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      clearTimeout(timeout)
      if (res.ok) {
        const text = await res.text()
        if (text.length > 100) return text
      }
    } catch {}
  }

  return null
}

// Fetch search engine HTML via proxy
async function fetchSearchPage(url: string): Promise<string | null> {
  const proxies = [
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  ]

  for (const proxyFn of proxies) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12000)
      const res = await fetch(proxyFn(url), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      })
      clearTimeout(timeout)
      if (res.ok) {
        const text = await res.text()
        if (text.length > 500) return text
      }
    } catch {}
  }

  // Try direct as last resort
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    clearTimeout(timeout)
    if (res.ok) return await res.text()
  } catch {}

  return null
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
  'reddit.com', 'quora.com', 'medium.com', 'microsoft.com',
  'apple.com', 'bbc.co.uk', 'bbc.com', 'allorigins.win',
  'codetabs.com',
]

function isBlockedDomain(url: string): boolean {
  const lower = url.toLowerCase()
  return BLOCKED_DOMAINS.some(d => lower.includes(d))
}

function cleanResult(title: string, link: string, category: string): BusinessResult | null {
  if (!title || !link || !link.startsWith('http') || isBlockedDomain(link)) return null
  let cleanUrl = link
  try { cleanUrl = new URL(link).origin } catch { return null }
  return {
    name: title.replace(/ - .*$/, '').replace(/ \| .*$/, '').replace(/\s*\(.*\)\s*$/, '').trim().substring(0, 80),
    website: cleanUrl,
    phone: '',
    address: '',
    category,
  }
}

// Google via proxy
async function searchGoogle(query: string): Promise<BusinessResult[]> {
  const results: BusinessResult[] = []
  const category = query.split(' ')[0] || 'business'
  const url = `https://www.google.com/search?q=${encodeURIComponent(query + ' website')}&num=20&hl=en`
  const html = await fetchSearchPage(url)
  if (!html) return results

  const $ = cheerio.load(html)
  $('div.g').each((_, el) => {
    const title = $(el).find('h3').first().text().trim()
    const link = $(el).find('a').first().attr('href') || ''
    const cleaned = cleanResult(title, link, category)
    if (cleaned) results.push(cleaned)
  })
  return results
}

// DuckDuckGo via POST (works directly, no proxy needed)
async function searchDuckDuckGo(query: string): Promise<BusinessResult[]> {
  const results: BusinessResult[] = []
  const category = query.split(' ')[0] || 'business'

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    const res = await fetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: `q=${encodeURIComponent(query + ' website')}`,
    })
    clearTimeout(timeout)
    const html = await res.text()
    const $ = cheerio.load(html)

    // DDG uses class="result__a" with href containing uddg= redirect
    $('a.result__a').each((_, el) => {
      const title = $(el).text().trim()
      let link = $(el).attr('href') || ''

      // Decode the uddg redirect parameter
      if (link.includes('uddg=')) {
        try {
          const match = link.match(/uddg=([^&]+)/)
          if (match) link = decodeURIComponent(match[1])
        } catch {}
      }

      const cleaned = cleanResult(title, link, category)
      if (cleaned) results.push(cleaned)
    })

    // Also try via proxy if direct didn't work
    if (results.length === 0) {
      const proxyHtml = await fetchSearchPage(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' website')}`)
      if (proxyHtml) {
        const $2 = cheerio.load(proxyHtml)
        $2('a.result__a').each((_, el) => {
          const title = $2(el).text().trim()
          let link = $2(el).attr('href') || ''
          if (link.includes('uddg=')) {
            try {
              const match = link.match(/uddg=([^&]+)/)
              if (match) link = decodeURIComponent(match[1])
            } catch {}
          }
          const cleaned = cleanResult(title, link, category)
          if (cleaned) results.push(cleaned)
        })
      }
    }
  } catch (err) {
    console.error('DDG search error:', err)
  }

  return results
}

// Bing via proxy
async function searchBing(query: string): Promise<BusinessResult[]> {
  const results: BusinessResult[] = []
  const category = query.split(' ')[0] || 'business'
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query + ' website')}&count=20`
  const html = await fetchSearchPage(url)
  if (!html) return results

  const $ = cheerio.load(html)
  $('li.b_algo').each((_, el) => {
    const titleEl = $(el).find('h2 a')
    const title = titleEl.text().trim()
    const link = titleEl.attr('href') || ''
    const cleaned = cleanResult(title, link, category)
    if (cleaned) results.push(cleaned)
  })
  return results
}

// Yahoo via proxy
async function searchYahoo(query: string): Promise<BusinessResult[]> {
  const results: BusinessResult[] = []
  const category = query.split(' ')[0] || 'business'
  const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query + ' website')}&n=20`
  const html = await fetchSearchPage(url)
  if (!html) return results

  const $ = cheerio.load(html)
  $('div.algo').each((_, el) => {
    const titleEl = $(el).find('h3 a')
    const title = titleEl.text().trim()
    const link = titleEl.attr('href') || ''
    const cleaned = cleanResult(title, link, category)
    if (cleaned) results.push(cleaned)
  })
  return results
}

export async function searchBusinesses(
  query: string,
  googleCseKey?: string,
  googleCseId?: string,
  serpApiKey?: string,
): Promise<BusinessResult[]> {
  const promises: Promise<BusinessResult[]>[] = []

  // Use paid APIs if configured
  if (serpApiKey) {
    promises.push(searchSerpAPI(query, serpApiKey))
  }
  if (googleCseKey && googleCseId) {
    promises.push(searchGoogleCSE(query, googleCseKey, googleCseId))
  }

  // Free: search all engines via proxy
  promises.push(searchGoogle(query))
  promises.push(searchDuckDuckGo(query))
  promises.push(searchBing(query))
  promises.push(searchYahoo(query))

  const settled = await Promise.allSettled(promises)
  const all: BusinessResult[] = []
  for (const r of settled) {
    if (r.status === 'fulfilled') all.push(...r.value)
  }

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

// Optional: SerpAPI (if user provides key)
async function searchSerpAPI(query: string, apiKey: string): Promise<BusinessResult[]> {
  const results: BusinessResult[] = []
  const category = query.split(' ')[0] || 'business'
  try {
    const res = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}&num=20`)
    const data = await res.json()
    if (data.local_results?.places) {
      for (const place of data.local_results.places) {
        if (place.website) {
          results.push({ name: place.title || '', website: place.website, phone: place.phone || '', address: place.address || '', category })
        }
      }
    }
    if (data.organic_results) {
      for (const item of data.organic_results) {
        const cleaned = cleanResult(item.title || '', item.link || '', category)
        if (cleaned) results.push(cleaned)
      }
    }
  } catch {}
  return results
}

// Optional: Google CSE (if user provides key)
async function searchGoogleCSE(query: string, apiKey: string, cseId: string): Promise<BusinessResult[]> {
  const results: BusinessResult[] = []
  const category = query.split(' ')[0] || 'business'
  try {
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}&num=10`)
    const data = await res.json()
    if (data.items) {
      for (const item of data.items) {
        const cleaned = cleanResult(item.title || '', item.link || '', category)
        if (cleaned) results.push(cleaned)
      }
    }
  } catch {}
  return results
}
