import * as cheerio from 'cheerio'

export interface AuditResult {
  score: number
  load_time: number
  has_ssl: boolean
  has_mobile_viewport: boolean
  has_title: boolean
  has_meta_description: boolean
  has_h1: boolean
  has_og_tags: boolean
  has_analytics: boolean
  image_count: number
  content_length: number
  font_count: number
  issues: string[]
  raw_data: Record<string, unknown>
}

export async function auditWebsite(url: string): Promise<AuditResult> {
  const issues: string[] = []
  const raw_data: Record<string, unknown> = {}

  let has_ssl = url.startsWith('https')
  if (!has_ssl) issues.push('Website does not use SSL/HTTPS - security risk')

  let html = ''
  let load_time = 0

  try {
    const start = Date.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AuditBot/1.0)' },
      redirect: 'follow',
    })
    clearTimeout(timeout)
    load_time = (Date.now() - start) / 1000
    html = await res.text()

    // Check if redirected to HTTPS
    if (res.url.startsWith('https')) has_ssl = true
  } catch {
    return {
      score: 0, load_time: 0, has_ssl: false, has_mobile_viewport: false,
      has_title: false, has_meta_description: false, has_h1: false,
      has_og_tags: false, has_analytics: false, image_count: 0,
      content_length: 0, font_count: 0,
      issues: ['Website is unreachable or too slow to respond'],
      raw_data: {},
    }
  }

  const $ = cheerio.load(html)

  // Load time check
  raw_data.load_time = load_time
  if (load_time > 3) issues.push(`Slow load time: ${load_time.toFixed(1)}s (should be under 3s)`)
  if (load_time > 5) issues.push('Critical: Page takes over 5 seconds to load')

  // Mobile viewport
  const viewport = $('meta[name="viewport"]').attr('content') || ''
  const has_mobile_viewport = viewport.includes('width=')
  if (!has_mobile_viewport) issues.push('Missing mobile viewport meta tag - not mobile friendly')

  // Title
  const title = $('title').text().trim()
  const has_title = title.length > 0
  raw_data.title = title
  if (!has_title) issues.push('Missing page title - critical for SEO')
  else if (title.length < 20) issues.push(`Title too short (${title.length} chars) - aim for 50-60 characters`)
  else if (title.length > 70) issues.push(`Title too long (${title.length} chars) - search engines will truncate it`)

  // Meta description
  const metaDesc = $('meta[name="description"]').attr('content') || ''
  const has_meta_description = metaDesc.length > 0
  raw_data.meta_description = metaDesc
  if (!has_meta_description) issues.push('Missing meta description - losing click-through from search results')
  else if (metaDesc.length < 70) issues.push('Meta description too short - not compelling enough for search results')
  else if (metaDesc.length > 160) issues.push('Meta description too long - will be truncated in search results')

  // H1
  const h1s = $('h1')
  const has_h1 = h1s.length > 0
  if (!has_h1) issues.push('Missing H1 heading - bad for SEO and accessibility')
  if (h1s.length > 1) issues.push(`Multiple H1 tags found (${h1s.length}) - should have exactly one`)

  // OG tags
  const ogTitle = $('meta[property="og:title"]').attr('content')
  const ogDesc = $('meta[property="og:description"]').attr('content')
  const ogImage = $('meta[property="og:image"]').attr('content')
  const has_og_tags = !!(ogTitle && ogDesc && ogImage)
  if (!ogTitle) issues.push('Missing og:title - social media shares will look unprofessional')
  if (!ogDesc) issues.push('Missing og:description - social media previews will be blank')
  if (!ogImage) issues.push('Missing og:image - no image preview when shared on social media')

  // Analytics
  const htmlLower = html.toLowerCase()
  const has_analytics = htmlLower.includes('google-analytics') ||
    htmlLower.includes('gtag') ||
    htmlLower.includes('analytics.js') ||
    htmlLower.includes('gtm.js') ||
    htmlLower.includes('facebook.net/en_US/fbevents') ||
    htmlLower.includes('hotjar')
  if (!has_analytics) issues.push('No analytics detected - not tracking visitor behavior')

  // Images
  const images = $('img')
  const image_count = images.length
  let imagesWithoutAlt = 0
  images.each((_, el) => {
    if (!$(el).attr('alt')) imagesWithoutAlt++
  })
  if (imagesWithoutAlt > 0) issues.push(`${imagesWithoutAlt} images missing alt text - bad for accessibility and SEO`)

  // Content length
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
  const content_length = bodyText.length
  if (content_length < 500) issues.push('Very little text content - search engines need more content to rank this page')

  // Fonts
  const fontLinks = $('link[href*="font"]').length
  const fontFaces = (html.match(/@font-face/g) || []).length
  const font_count = fontLinks + fontFaces
  if (font_count > 5) issues.push(`Too many fonts loaded (${font_count}) - slowing down page load`)

  // Additional checks
  const canonical = $('link[rel="canonical"]').attr('href')
  if (!canonical) issues.push('Missing canonical URL - risk of duplicate content issues')

  const favicon = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href')
  if (!favicon) issues.push('Missing favicon - looks unprofessional in browser tabs')

  // Calculate score
  let score = 100
  const weights: Record<string, number> = {
    ssl: 15, mobile: 15, title: 10, meta: 10, h1: 5,
    og: 5, analytics: 5, speed: 15, content: 10, images: 5, other: 5,
  }

  if (!has_ssl) score -= weights.ssl
  if (!has_mobile_viewport) score -= weights.mobile
  if (!has_title) score -= weights.title
  if (!has_meta_description) score -= weights.meta
  if (!has_h1) score -= weights.h1
  if (!has_og_tags) score -= weights.og
  if (!has_analytics) score -= weights.analytics
  if (load_time > 3) score -= Math.min(weights.speed, Math.floor(load_time * 2))
  if (content_length < 500) score -= weights.content
  if (imagesWithoutAlt > 0) score -= Math.min(weights.images, imagesWithoutAlt)

  score = Math.max(0, Math.min(100, score))

  return {
    score, load_time, has_ssl, has_mobile_viewport, has_title,
    has_meta_description, has_h1, has_og_tags, has_analytics,
    image_count, content_length, font_count, issues, raw_data,
  }
}
