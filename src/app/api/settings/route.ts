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

  // Check if settings exist
  const { data: existing } = await supabase.from('settings').select('id').limit(1).single()

  if (existing) {
    const { error } = await supabase
      .from('settings')
      .update({
        gmail_user: body.gmail_user,
        gmail_app_password: body.gmail_app_password,
        sender_name: body.sender_name,
        company_name: body.company_name,
        email_delay_seconds: body.email_delay_seconds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    return NextResponse.json({ success: !error, error: error?.message })
  } else {
    const { error } = await supabase.from('settings').insert({
      gmail_user: body.gmail_user,
      gmail_app_password: body.gmail_app_password,
      sender_name: body.sender_name,
      company_name: body.company_name,
      email_delay_seconds: body.email_delay_seconds,
    })
    return NextResponse.json({ success: !error, error: error?.message })
  }
}
