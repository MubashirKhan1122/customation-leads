import { NextRequest, NextResponse } from 'next/server'
import { scrapeEmails } from '@/lib/scraper'
import { auditWebsite } from '@/lib/auditor'
import { detectServiceNeeds, getPitchSummary } from '@/lib/prospector'
import { getServiceSupabase } from '@/lib/supabase'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { place, city, query } = await req.json()
  const supabase = getServiceSupabase()

  let emails: string[] = []
  let score: number | null = null
  let auditResult = null
  let needs: any[] = []
  let pitchSummary = ''

  if (place.website) {
    // Scrape emails
    try {
      emails = await scrapeEmails(place.website)
    } catch {}

    // Audit website
    try {
      auditResult = await auditWebsite(place.website)
      score = auditResult.score

      // Detect what services they need
      needs = detectServiceNeeds(auditResult)
      pitchSummary = getPitchSummary(needs)
    } catch {}
  } else {
    // No website = they definitely need one
    needs = [{
      service: 'Website Design',
      priority: 'critical',
      pitch: 'No website at all — pitch a full website build + Google presence',
      icon: '🌐',
    }]
    pitchSummary = '🔥 HOT LEAD: No website — needs full web presence'
    score = 0
  }

  // Save to database
  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      name: place.name,
      website: place.website || '',
      phone: place.phone || null,
      email: emails[0] || null,
      address: place.address ? `${place.address}, ${city}` : city,
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
    needs,
    pitchSummary,
  })
}
