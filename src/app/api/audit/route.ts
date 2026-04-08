import { NextRequest, NextResponse } from 'next/server'
import { auditWebsite } from '@/lib/auditor'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get('lead_id')
  if (!leadId) return NextResponse.json({ error: 'Missing lead_id' }, { status: 400 })

  const supabase = getServiceSupabase()

  const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single()
  const { data: audit } = await supabase.from('audits').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(1).single()

  return NextResponse.json({ lead, audit })
}

export async function POST(req: NextRequest) {
  const { lead_id, url } = await req.json()

  const supabase = getServiceSupabase()
  const result = await auditWebsite(url)

  const { data: audit } = await supabase
    .from('audits')
    .insert({
      lead_id,
      score: result.score,
      load_time: result.load_time,
      has_ssl: result.has_ssl,
      has_mobile_viewport: result.has_mobile_viewport,
      has_title: result.has_title,
      has_meta_description: result.has_meta_description,
      has_h1: result.has_h1,
      has_og_tags: result.has_og_tags,
      has_analytics: result.has_analytics,
      image_count: result.image_count,
      content_length: result.content_length,
      font_count: result.font_count,
      issues: result.issues,
      raw_data: result.raw_data,
    })
    .select()
    .single()

  // Update lead score
  await supabase.from('leads').update({ score: result.score }).eq('id', lead_id)

  return NextResponse.json({ audit })
}
