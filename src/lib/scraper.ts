import * as cheerio from 'cheerio'

export async function scrapeEmails(url: string): Promise<string[]> {
  const emails = new Set<string>()
  const baseUrl = new URL(url).origin

  const pagesToCheck = [
    url,
    `${baseUrl}/contact`,
    `${baseUrl}/contact-us`,
    `${baseUrl}/about`,
    `${baseUrl}/about-us`,
  ]

  for (const pageUrl of pagesToCheck) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const res = await fetch(pageUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadBot/1.0)' },
      })
      clearTimeout(timeout)

      if (!res.ok) continue
      const html = await res.text()

      // Extract emails from HTML
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      const found = html.match(emailRegex) || []
      found.forEach(e => {
        const lower = e.toLowerCase()
        if (!lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.endsWith('.gif') && !lower.includes('example') && !lower.includes('wixpress') && !lower.includes('sentry')) {
          emails.add(lower)
        }
      })

      // Check mailto links
      const $ = cheerio.load(html)
      $('a[href^="mailto:"]').each((_, el) => {
        const href = $(el).attr('href')
        if (href) {
          const email = href.replace('mailto:', '').split('?')[0].trim().toLowerCase()
          if (email.includes('@')) emails.add(email)
        }
      })
    } catch {
      continue
    }
  }

  return Array.from(emails)
}

export async function searchBusinesses(query: string): Promise<Array<{
  name: string
  website: string
  phone: string
  address: string
  category: string
}>> {
  // Use Google Custom Search or scrape approach
  // For demo, we use a web search scraping approach
  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20`
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    const html = await res.text()
    const $ = cheerio.load(html)

    const results: Array<{
      name: string
      website: string
      phone: string
      address: string
      category: string
    }> = []

    // Extract search results
    $('div.g').each((_, el) => {
      const title = $(el).find('h3').first().text().trim()
      const link = $(el).find('a').first().attr('href') || ''

      if (title && link && link.startsWith('http') && !link.includes('google.com')) {
        results.push({
          name: title,
          website: link,
          phone: '',
          address: '',
          category: query.split(' ')[0] || 'business',
        })
      }
    })

    return results.slice(0, 20)
  } catch (error) {
    console.error('Search error:', error)
    return []
  }
}
