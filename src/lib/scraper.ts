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

// Use Google Custom Search JSON API (100 free queries/day)
async function searchGoogleCSE(query: string, apiKey: string, cseId: string): Promise<BusinessResult[]> {
  const results: BusinessResult[] = []
  const category = query.split(' ')[0] || 'business'

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}&num=10`
    const res = await fetch(url)
    const data = await res.json()

    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        const link = item.link || ''
        if (!link.startsWith('http')) continue

        let cleanUrl = link
        try { cleanUrl = new URL(link).origin } catch {}

        results.push({
          name: (item.title || '').replace(/ - .*$/, '').replace(/ \| .*$/, '').trim(),
          website: cleanUrl,
          phone: '',
          address: item.snippet || '',
          category,
        })
      }
    }
  } catch (err) {
    console.error('Google CSE error:', err)
  }
  return results
}

// Use SerpAPI for Google search (free tier: 100/month)
async function searchSerpAPI(query: string, apiKey: string): Promise<BusinessResult[]> {
  const results: BusinessResult[] = []
  const category = query.split(' ')[0] || 'business'

  try {
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}&num=20`
    const res = await fetch(url)
    const data = await res.json()

    // Local results (Google Maps businesses)
    if (data.local_results?.places) {
      for (const place of data.local_results.places) {
        if (place.website) {
          results.push({
            name: place.title || place.name || '',
            website: place.website,
            phone: place.phone || '',
            address: place.address || '',
            category,
          })
        }
      }
    }

    // Organic results
    if (data.organic_results) {
      for (const item of data.organic_results) {
        const link = item.link || ''
        if (!link.startsWith('http')) continue
        if (isBlockedDomain(link)) continue

        let cleanUrl = link
        try { cleanUrl = new URL(link).origin } catch {}

        results.push({
          name: (item.title || '').replace(/ - .*$/, '').replace(/ \| .*$/, '').trim(),
          website: cleanUrl,
          phone: '',
          address: item.snippet || '',
          category,
        })
      }
    }
  } catch (err) {
    console.error('SerpAPI error:', err)
  }
  return results
}

const BLOCKED_DOMAINS = [
  'google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com',
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'youtube.com', 'linkedin.com', 'pinterest.com', 'tiktok.com',
  'yelp.com', 'tripadvisor.com', 'wikipedia.org', 'amazon.com',
  'reddit.com', 'quora.com', 'medium.com', 'microsoft.com',
  'apple.com', 'bbc.co.uk', 'bbc.com',
]

function isBlockedDomain(url: string): boolean {
  const lower = url.toLowerCase()
  return BLOCKED_DOMAINS.some(d => lower.includes(d))
}

// Fallback: DuckDuckGo HTML
async function searchDuckDuckGo(query: string): Promise<BusinessResult[]> {
  const results: BusinessResult[] = []
  const category = query.split(' ')[0] || 'business'
  try {
    const res = await fetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
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

      if (title && link && link.startsWith('http') && !isBlockedDomain(link)) {
        let cleanUrl = link
        try { cleanUrl = new URL(link).origin } catch {}
        results.push({ name: title.replace(/ - .*$/, '').replace(/ \| .*$/, '').trim(), website: cleanUrl, phone: '', address: '', category })
      }
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
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    $('li.b_algo').each((_, el) => {
      const titleEl = $(el).find('h2 a')
      const title = titleEl.text().trim()
      const link = titleEl.attr('href') || ''
      if (title && link && link.startsWith('http') && !isBlockedDomain(link)) {
        let cleanUrl = link
        try { cleanUrl = new URL(link).origin } catch {}
        results.push({ name: title.replace(/ - .*$/, '').replace(/ \| .*$/, '').trim(), website: cleanUrl, phone: '', address: '', category })
      }
    })
  } catch (err) {
    console.error('Bing error:', err)
  }
  return results
}

export async function searchBusinesses(
  query: string,
  googleCseKey?: string,
  googleCseId?: string,
  serpApiKey?: string,
): Promise<BusinessResult[]> {
  const promises: Promise<BusinessResult[]>[] = []

  // Use real APIs if configured
  if (serpApiKey) {
    promises.push(searchSerpAPI(query, serpApiKey))
  }
  if (googleCseKey && googleCseId) {
    promises.push(searchGoogleCSE(query, googleCseKey, googleCseId))
  }

  // Always try free scraping as fallback
  promises.push(searchDuckDuckGo(query))
  promises.push(searchBing(query))

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
