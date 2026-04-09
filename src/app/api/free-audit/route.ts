import { NextRequest, NextResponse } from 'next/server'
import { auditWebsite } from '@/lib/auditor'
import { getServiceSupabase } from '@/lib/supabase'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const { url, email } = await req.json()

  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  try {
    const audit = await auditWebsite(url)
    const supabase = getServiceSupabase()

    let domain = url
    try { domain = new URL(url).hostname } catch {}

    // Save lead (with or without email)
    const { data: lead } = await supabase.from('leads').insert({
      name: domain,
      website: url,
      email: email || null,
      source_query: 'free-audit-tool',
      score: audit.score,
      status: 'new',
      category: 'inbound',
    }).select().single()

    // Save full audit result
    if (lead) {
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

    return NextResponse.json({ audit })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
