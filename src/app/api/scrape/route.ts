import { NextRequest, NextResponse } from 'next/server'
import { scrapeEmails, searchBusinesses } from '@/lib/scraper'
import { auditWebsite } from '@/lib/auditor'
import { getServiceSupabase } from '@/lib/supabase'
import { isDuplicate } from '@/lib/dedup'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = getServiceSupabase()

  if (body.action === 'search') {
    try {
      // Get API keys from settings
      const { data: settings } = await supabase.from('settings').select('serpapi_key, google_cse_key, google_cse_id').limit(1).single()

      const serpApiKey = settings?.serpapi_key || process.env.SERPAPI_KEY
      const googleCseKey = settings?.google_cse_key || process.env.GOOGLE_CSE_KEY
      const googleCseId = settings?.google_cse_id || process.env.GOOGLE_CSE_ID

      const results = await searchBusinesses(
        body.query,
        googleCseKey,
        googleCseId,
        serpApiKey,
      )
      return NextResponse.json({ results, count: results.length })
    } catch (error: any) {
      console.error('Search error:', error)
      return NextResponse.json({ results: [], error: error.message })
    }
  }

  if (body.action === 'process') {
    const { business, query } = body

    try {
      // Scrape emails
      let emails: string[] = []
      try {
        emails = await scrapeEmails(business.website)
      } catch (err) {
        console.error('Email scrape error:', err)
      }

      // Audit website
      let score: number | null = null
      let auditResult = null
      try {
        auditResult = await auditWebsite(business.website)
        score = auditResult.score
      } catch (err) {
        console.error('Audit error:', err)
      }

      // Check for duplicates
      const duplicate = await isDuplicate(business.website)
      if (duplicate) {
        return NextResponse.json({
          emails,
          score,
          saved: false,
          duplicate: true,
          lead_id: null,
        })
      }

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

      if (error) console.error('DB insert error:', error)

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
    } catch (error: any) {
      console.error('Process error:', error)
      return NextResponse.json({ emails: [], score: null, saved: false, error: error.message })
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
