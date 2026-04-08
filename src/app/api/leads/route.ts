import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = getServiceSupabase()
  const params = req.nextUrl.searchParams

  let query = supabase.from('leads').select('*').order('created_at', { ascending: false })

  const status = params.get('status')
  if (status && status !== 'all') query = query.eq('status', status)

  const scoreFilter = params.get('score')
  if (scoreFilter === 'hot') query = query.lt('score', 60)
  else if (scoreFilter === 'warm') query = query.gte('score', 60).lt('score', 80)
  else if (scoreFilter === 'cold') query = query.gte('score', 80)

  const emailFilter = params.get('email')
  if (emailFilter === 'has_email') query = query.not('email', 'is', null)
  else if (emailFilter === 'no_email') query = query.is('email', null)

  const search = params.get('search')
  if (search) query = query.or(`name.ilike.%${search}%,website.ilike.%${search}%`)

  const { data: leads, error } = await query.limit(200)

  return NextResponse.json({ leads: leads || [], error: error?.message })
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json()
  const supabase = getServiceSupabase()

  const { error } = await supabase.from('leads').update({ status }).eq('id', id)
  return NextResponse.json({ success: !error, error: error?.message })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = getServiceSupabase()
  const { error } = await supabase.from('leads').delete().eq('id', id)
  return NextResponse.json({ success: !error })
}
