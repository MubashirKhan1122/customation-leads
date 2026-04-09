import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = getServiceSupabase()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  // Get stats for each campaign
  const enriched = []
  for (const camp of campaigns || []) {
    const { data: leads } = await supabase
      .from('leads')
      .select('id, email, score, status')
      .eq('campaign_id', camp.id)

    const leadsList = leads || []
    enriched.push({
      ...camp,
      total_leads: leadsList.length,
      with_email: leadsList.filter(l => l.email).length,
      avg_score: leadsList.length > 0
        ? Math.round(leadsList.filter(l => l.score != null).reduce((a, b) => a + (b.score || 0), 0) / Math.max(leadsList.filter(l => l.score != null).length, 1))
        : 0,
      contacted: leadsList.filter(l => l.status === 'contacted').length,
      replied: leadsList.filter(l => l.status === 'replied').length,
    })
  }

  return NextResponse.json({ campaigns: enriched })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = getServiceSupabase()

  if (body.action === 'create') {
    const { data, error } = await supabase
      .from('campaigns')
      .insert({ name: body.name, description: body.description || '' })
      .select()
      .single()
    return NextResponse.json({ campaign: data, error: error?.message })
  }

  if (body.action === 'assign') {
    // Assign leads to campaign
    const { error } = await supabase
      .from('leads')
      .update({ campaign_id: body.campaign_id })
      .in('id', body.lead_ids)
    return NextResponse.json({ success: !error, error: error?.message })
  }

  if (body.action === 'update') {
    const { error } = await supabase
      .from('campaigns')
      .update({ name: body.name, description: body.description, status: body.status, updated_at: new Date().toISOString() })
      .eq('id', body.id)
    return NextResponse.json({ success: !error })
  }

  if (body.action === 'delete') {
    // Unassign leads first
    await supabase.from('leads').update({ campaign_id: null }).eq('campaign_id', body.id)
    const { error } = await supabase.from('campaigns').delete().eq('id', body.id)
    return NextResponse.json({ success: !error })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
