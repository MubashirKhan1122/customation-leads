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

  // Email activity stats
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString()

  const emails_today = emails.filter(e => e.status === 'sent' && e.sent_at && e.sent_at >= todayStart).length
  const emails_week = emails.filter(e => e.status === 'sent' && e.sent_at && e.sent_at >= weekStart).length

  // Follow-up stats
  const { data: followUps } = await supabase.from('follow_up_sequences').select('status')
  const followups_pending = (followUps || []).filter(f => f.status === 'pending').length
  const followups_sent = (followUps || []).filter(f => f.status === 'sent').length

  // Leads by status
  const statusCounts: Record<string, number> = {}
  for (const lead of leads) {
    statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1
  }
  const leads_by_status = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

  return NextResponse.json({
    total_leads,
    leads_with_email,
    emails_sent,
    emails_replied,
    avg_score,
    hot_leads,
    emails_today,
    emails_week,
    followups_pending,
    followups_sent,
    recent_leads: leads.slice(0, 10),
    leads_by_status,
  })
}
