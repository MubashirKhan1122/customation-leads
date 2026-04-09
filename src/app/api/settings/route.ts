import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = getServiceSupabase()
  const { data } = await supabase.from('settings').select('*').limit(1).single()
  return NextResponse.json({ settings: data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = getServiceSupabase()

  const settingsData = {
    gmail_user: body.gmail_user,
    gmail_app_password: body.gmail_app_password,
    sender_name: body.sender_name,
    company_name: body.company_name,
    email_delay_seconds: body.email_delay_seconds,
    serpapi_key: body.serpapi_key || '',
    google_cse_key: body.google_cse_key || '',
    google_cse_id: body.google_cse_id || '',
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await supabase.from('settings').select('id').limit(1).single()

  if (existing) {
    const { error } = await supabase.from('settings').update(settingsData).eq('id', existing.id)
    return NextResponse.json({ success: !error, error: error?.message })
  } else {
    const { error } = await supabase.from('settings').insert(settingsData)
    return NextResponse.json({ success: !error, error: error?.message })
  }
}
