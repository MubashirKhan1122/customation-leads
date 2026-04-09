import { NextRequest, NextResponse } from 'next/server'
import { findPlaces } from '@/lib/places'
import { scrapeEmails } from '@/lib/scraper'
import { auditWebsite } from '@/lib/auditor'
import { getServiceSupabase } from '@/lib/supabase'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Action: debug — test Overpass directly
  if (body.action === 'debug') {
    const logs: string[] = []
    try {
      // Test Nominatim
      logs.push('Testing Nominatim...')
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent('london')}&format=json&limit=1`,
        { headers: { 'User-Agent': 'CustomationLeadMachine/1.0' } }
      )
      const geoData = await geoRes.json()
      logs.push(`Nominatim: ${geoRes.status}, ${JSON.stringify(geoData[0]?.lat)}`)

      // Test Overpass
      logs.push('Testing Overpass...')
      const query = `[out:json][timeout:25];(node["amenity"="restaurant"](around:5000,51.5074,-0.1278););out body 5;`
      const ovRes = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      })
      const ovText = await ovRes.text()
      logs.push(`Overpass: status=${ovRes.status}, length=${ovText.length}, first100=${ovText.substring(0, 100)}`)
      try {
        const ovData = JSON.parse(ovText)
        logs.push(`Overpass elements: ${ovData?.elements?.length}`)
      } catch {
        logs.push('Overpass: failed to parse JSON')
      }
    } catch (err: any) {
      logs.push(`Error: ${err.message}`)
    }
    return NextResponse.json({ logs })
  }

  // Action: find — just find places (fast)
  if (body.action === 'find') {
    try {
      const { places, location } = await findPlaces(body.query, body.lat, body.lng)
      return NextResponse.json({ places, location })
    } catch (err: any) {
      console.error('Find places error:', err)
      return NextResponse.json({ places: [], location: null, error: err.message })
    }
  }

  // Action: process — scrape emails + audit + save to DB
  if (body.action === 'process') {
    const supabase = getServiceSupabase()
    const { place, query } = body

    let emails: string[] = []
    let auditResult = null
    let score: number | null = null

    // Scrape emails if website exists
    if (place.website) {
      try {
        emails = await scrapeEmails(place.website)
      } catch {}

      try {
        auditResult = await auditWebsite(place.website)
        score = auditResult.score
      } catch {}
    }

    // Save lead
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        name: place.name,
        website: place.website || '',
        phone: place.phone || null,
        email: emails[0] || null,
        address: place.address || null,
        category: place.category || null,
        source_query: query,
        score,
        status: 'new',
      })
      .select()
      .single()

    if (error) console.error('DB error:', error)

    // Save audit
    if (lead && auditResult) {
      await supabase.from('audits').insert({
        lead_id: lead.id,
        score: auditResult.score,
        load_time: auditResult.load_time,
        has_ssl: auditResult.has_ssl,
        has_mobile_viewport: auditResult.has_mobile_viewport,
        has_title: auditResult.has_title,
        has_meta_description: auditResult.has_meta_description,
        has_h1: auditResult.has_h1,
        has_og_tags: auditResult.has_og_tags,
        has_analytics: auditResult.has_analytics,
        image_count: auditResult.image_count,
        content_length: auditResult.content_length,
        font_count: auditResult.font_count,
        issues: auditResult.issues,
        raw_data: auditResult.raw_data,
      })
    }

    return NextResponse.json({
      emails,
      score,
      saved: !!lead,
      lead_id: lead?.id,
    })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
