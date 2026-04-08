import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = getServiceSupabase()

  const [leadsRes, emailsRes] = await Promise.all([
    supabase.from('leads').select('*').order('created_at', { ascending: false }),
    supabase.from('email_logs').select('*'),
  ])

  const leads = leadsRes.data || []
  const emails = emailsRes.data || []

  const total_leads = leads.length
  const leads_with_email = leads.filter(l => l.email).length
  const emails_sent = emails.filter(e => e.status === 'sent').length
  const emails_replied = emails.filter(e => e.status === 'replied').length
  const scores = leads.filter(l => l.score !== null).map(l => l.score as number)
  const avg_score = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const hot_leads = leads.filter(l => l.score !== null && l.score < 60).length

  return NextResponse.json({
    total_leads,
    leads_with_email,
    emails_sent,
    emails_replied,
    avg_score,
    hot_leads,
    recent_leads: leads.slice(0, 10),
  })
}
