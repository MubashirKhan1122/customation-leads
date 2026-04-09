import { NextRequest, NextResponse } from 'next/server'
import { scrapeEmails } from '@/lib/scraper'
import { auditWebsite } from '@/lib/auditor'
import { detectDigitalGap } from '@/lib/digital-gap'
import { isDuplicate } from '@/lib/dedup'
import { getServiceSupabase } from '@/lib/supabase'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Action: find businesses in a specific paper-based industry
  if (body.action === 'find') {
    const { lat, lng, tags, radius = 20000 } = body

    const nodeQueries = tags.map((tag: string) => `node${tag}(around:${radius},${lat},${lng});`).join('')
    const wayQueries = tags.map((tag: string) => `way${tag}(around:${radius},${lat},${lng});`).join('')
    const query = `[out:json][timeout:30];(${nodeQueries}${wayQueries});out body 500;`

    const servers = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ]

    let data: any = null
    for (const server of servers) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)
        const res = await fetch(server, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
        })
        clearTimeout(timeout)
        if (res.ok) {
          data = await res.json()
          if (data?.elements?.length > 0) break
        }
      } catch { continue }
    }

    const places: any[] = []
    if (data?.elements) {
      for (const el of data.elements) {
        const t = el.tags || {}
        const name = t.name || t['name:en'] || ''
        if (!name) continue

        let website = t.website || t['contact:website'] || t.url || ''
        if (website && !website.startsWith('http')) website = 'https://' + website

        const phone = t.phone || t['contact:phone'] || t.fax || t['contact:fax'] || ''
        const fax = t.fax || t['contact:fax'] || ''
        const email = t.email || t['contact:email'] || ''

        places.push({
          name,
          website,
          phone,
          fax,
          email: email || '',
          address: [t['addr:street'], t['addr:city']].filter(Boolean).join(', '),
          hasFax: !!fax,
        })
      }
    }

    // Sort: no website first (most paper-based), then by having fax
    places.sort((a, b) => {
      if (!a.website && b.website) return -1
      if (a.website && !b.website) return 1
      if (a.hasFax && !b.hasFax) return -1
      if (!a.hasFax && b.hasFax) return 1
      return 0
    })

    return NextResponse.json({ places: places.slice(0, 200) })
  }

  // Action: analyze a single business
  if (body.action === 'analyze') {
    const { place, industry, city } = body
    const supabase = getServiceSupabase()

    let emails: string[] = []
    let audit = null
    let score: number | null = null

    if (place.website) {
      try { emails = await scrapeEmails(place.website) } catch {}
      try { audit = await auditWebsite(place.website); score = audit.score } catch {}
    }

    // Add any email from OSM data
    if (place.email && !emails.includes(place.email.toLowerCase())) {
      emails.unshift(place.email.toLowerCase())
    }

    // Detect digital gap
    const gap = detectDigitalGap(
      audit,
      !!place.website,
      emails.length > 0 || !!place.email
    )

    // Check duplicate
    const duplicate = place.website ? await isDuplicate(place.website) : false
    if (duplicate) {
      return NextResponse.json({ emails, score, gap, saved: false, duplicate: true })
    }

    // Save lead
    const { data: lead } = await supabase
      .from('leads')
      .insert({
        name: place.name,
        website: place.website || '',
        phone: place.phone || null,
        email: emails[0] || null,
        address: place.address ? `${place.address}, ${city}` : city,
        category: industry,
        source_query: `digital-gap: ${industry} in ${city}`,
        score,
        status: 'new',
      })
      .select()
      .single()

    if (lead && audit) {
      await supabase.from('audits').insert({
        lead_id: lead.id,
        score: audit.score,
        load_time: audit.load_time,
        has_ssl: audit.has_ssl,
        has_mobile_viewport: audit.has_mobile_viewport,
        has_title: audit.has_title,
        has_meta_description: audit.has_meta_description,
        has_h1: audit.has_h1,
        has_og_tags: audit.has_og_tags,
        has_analytics: audit.has_analytics,
        image_count: audit.image_count,
        content_length: audit.content_length,
        font_count: audit.font_count,
        issues: audit.issues,
        raw_data: audit.raw_data,
      })
    }

    return NextResponse.json({ emails, score, gap, saved: !!lead, duplicate: false })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
