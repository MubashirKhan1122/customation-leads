import { NextRequest, NextResponse } from 'next/server'
import { scrapeEmails, searchBusinesses } from '@/lib/scraper'
import { auditWebsite } from '@/lib/auditor'
import { getServiceSupabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = getServiceSupabase()

  if (body.action === 'search') {
    const results = await searchBusinesses(body.query)
    return NextResponse.json({ results })
  }

  if (body.action === 'process') {
    const { business, query } = body

    try {
      // Scrape emails
      let emails: string[] = []
      try {
        emails = await scrapeEmails(business.website)
      } catch { }

      // Audit website
      let score: number | null = null
      let auditResult = null
      try {
        auditResult = await auditWebsite(business.website)
        score = auditResult.score
      } catch { }

      // Save lead to database
      const { data: lead, error } = await supabase
        .from('leads')
        .insert({
          name: business.name,
          website: business.website,
          phone: business.phone || null,
          email: emails[0] || null,
          address: business.address || null,
          category: business.category || null,
          source_query: query,
          score: score,
          status: 'new',
        })
        .select()
        .single()

      // Save audit if available
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
    } catch (error) {
      console.error('Process error:', error)
      return NextResponse.json({ emails: [], score: null, saved: false })
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
