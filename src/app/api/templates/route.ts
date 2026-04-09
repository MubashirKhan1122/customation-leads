import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = getServiceSupabase()
  const { data } = await supabase.from('email_templates').select('*').order('created_at', { ascending: true })
  return NextResponse.json({ templates: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = getServiceSupabase()

  if (body.action === 'create') {
    const { data, error } = await supabase.from('email_templates').insert({
      name: body.name,
      subject: body.subject,
      body_html: body.body_html,
      template_type: body.template_type || 'custom',
      is_default: false,
    }).select().single()
    return NextResponse.json({ template: data, error: error?.message })
  }

  if (body.action === 'update') {
    const { error } = await supabase.from('email_templates').update({
      name: body.name,
      subject: body.subject,
      body_html: body.body_html,
      template_type: body.template_type,
      updated_at: new Date().toISOString(),
    }).eq('id', body.id)
    return NextResponse.json({ success: !error, error: error?.message })
  }

  if (body.action === 'delete') {
    const { error } = await supabase.from('email_templates').delete().eq('id', body.id)
    return NextResponse.json({ success: !error })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
