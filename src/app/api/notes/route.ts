import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

// GET notes for a lead
export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get('lead_id')
  if (!leadId) return NextResponse.json({ error: 'Missing lead_id' }, { status: 400 })

  const supabase = getServiceSupabase()
  const { data } = await supabase
    .from('lead_notes')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ notes: data || [] })
}

// POST: add note
export async function POST(req: NextRequest) {
  const { lead_id, content } = await req.json()
  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from('lead_notes')
    .insert({ lead_id, content })
    .select()
    .single()

  return NextResponse.json({ note: data, error: error?.message })
}

// DELETE: delete note
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = getServiceSupabase()
  await supabase.from('lead_notes').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
