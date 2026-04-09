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

      // Extract emails from raw HTML
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

      // Check mailto links
      const $ = cheerio.load(html)
      $('a[href^="mailto:"]').each((_, el) => {
        const href = $(el).attr('href')
        if (href) {
          const email = href.replace('mailto:', '').split('?')[0].trim().toLowerCase()
          if (email.includes('@') && email.length < 60) emails.add(email)
        }
      })

      // Check structured data
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

// Search using DuckDuckGo HTML (most reliable for scraping)
async function searchDuckDuckGo(query: string): Promise<BusinessResult[]> {
  const results: BusinessResult[] = []
  try {
    // DuckDuckGo HTML requires POST request
    const res = await fetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: `q=${encodeURIComponent(query + ' website')}`,
      redirect: 'follow',
    })
    const html = await res.text()
    const $ = cheerio.load(html)

    $('.result').each((_, el) => {
      const titleEl = $(el).find('.result__a')
      const title = titleEl.text().trim()
      let link = titleEl.attr('href') || ''

      // DuckDuckGo HTML wraps links in a redirect
      if (link.includes('uddg=')) {
        try {
          const urlParam = new URL(link, 'https://duckduckgo.com').searchParams.get('uddg')
          if (urlParam) link = urlParam
        } catch {}
      }

      if (title && link && link.startsWith('http') &&
          !link.includes('duckduckgo.com') && !link.includes('google.com') &&
          !link.includes('yelp.com') && !link.includes('facebook.com') &&
          !link.includes('instagram.com') && !link.includes('twitter.com') &&
          !link.includes('youtube.com') && !link.includes('linkedin.com') &&
          !link.includes('tripadvisor.com') && !link.includes('wikipedia.org') &&
          !link.includes('amazon.com')) {

        // Try to extract just the origin
        let cleanUrl = link
        try {
          cleanUrl = new URL(link).origin
        } catch {}

        results.push({
          name: title.replace(/ - .*$/, '').replace(/ \| .*$/, '').trim(),
          website: cleanUrl,
          phone: '',
          address: '',
          category: query.split(' ')[0] || 'business',
        })
      }
    })
  } catch (err) {
    console.error('DuckDuckGo search error:', err)
  }
  return results
}

// Search using Bing as fallback
async function searchBing(query: string): Promise<BusinessResult[]> {
  const results: BusinessResult[] = []
  try {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query + ' official website')}&count=20`
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    const html = await res.text()
    const $ = cheerio.load(html)

    $('li.b_algo').each((_, el) => {
      const titleEl = $(el).find('h2 a')
      const title = titleEl.text().trim()
      const link = titleEl.attr('href') || ''

      if (title && link && link.startsWith('http') &&
          !link.includes('bing.com') && !link.includes('microsoft.com') &&
          !link.includes('yelp.com') && !link.includes('facebook.com') &&
          !link.includes('instagram.com') && !link.includes('wikipedia.org')) {

        let cleanUrl = link
        try {
          cleanUrl = new URL(link).origin
        } catch {}

        results.push({
          name: title.replace(/ - .*$/, '').replace(/ \| .*$/, '').trim(),
          website: cleanUrl,
          phone: '',
          address: '',
          category: query.split(' ')[0] || 'business',
        })
      }
    })
  } catch (err) {
    console.error('Bing search error:', err)
  }
  return results
}

// Google as third option
async function searchGoogle(query: string): Promise<BusinessResult[]> {
  const results: BusinessResult[] = []
  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20`
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    const html = await res.text()
    const $ = cheerio.load(html)

    $('div.g').each((_, el) => {
      const title = $(el).find('h3').first().text().trim()
      const link = $(el).find('a').first().attr('href') || ''

      if (title && link && link.startsWith('http') && !link.includes('google.com')) {
        let cleanUrl = link
        try {
          cleanUrl = new URL(link).origin
        } catch {}

        results.push({
          name: title.replace(/ - .*$/, '').replace(/ \| .*$/, '').trim(),
          website: cleanUrl,
          phone: '',
          address: '',
          category: query.split(' ')[0] || 'business',
        })
      }
    })
  } catch (err) {
    console.error('Google search error:', err)
  }
  return results
}

export async function searchBusinesses(query: string): Promise<BusinessResult[]> {
  // Try DuckDuckGo first (most reliable), then Bing, then Google
  let results = await searchDuckDuckGo(query)

  if (results.length < 3) {
    const bingResults = await searchBing(query)
    results = [...results, ...bingResults]
  }

  if (results.length < 3) {
    const googleResults = await searchGoogle(query)
    results = [...results, ...googleResults]
  }

  // Deduplicate by website domain
  const seen = new Set<string>()
  const unique: BusinessResult[] = []
  for (const r of results) {
    const domain = r.website.replace(/https?:\/\//, '').replace(/\/$/, '').toLowerCase()
    if (!seen.has(domain)) {
      seen.add(domain)
      unique.push(r)
    }
  }

  return unique.slice(0, 20)
}
