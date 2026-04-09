import { NextRequest, NextResponse } from 'next/server'
import { getDueFollowUps, cancelFollowUps, processTemplate } from '@/lib/followups'
import { sendEmail } from '@/lib/emailer'
import { getServiceSupabase } from '@/lib/supabase'

export const maxDuration = 60

// GET: Get follow-up status / pending follow-ups
export async function GET() {
  const supabase = getServiceSupabase()

  let pending: any[] = []
  let sent: any[] = []

  try {
    const { data: p } = await supabase
      .from('follow_up_sequences')
      .select('*, leads(name, email, website, score)')
      .eq('status', 'pending')
      .order('scheduled_at', { ascending: true })
      .limit(50)
    pending = p || []
  } catch {}

  try {
    const { data: s } = await supabase
      .from('follow_up_sequences')
      .select('*, leads(name, email)')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(20)
    sent = s || []
  } catch {}

  return NextResponse.json({ pending, sent })
}

// POST: Process due follow-ups (call this via cron or manually)
export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase()

  // Get settings
  const { data: settings } = await supabase.from('settings').select('*').limit(1).single()
  const gmailUser = settings?.gmail_user || process.env.GMAIL_USER || ''
  const gmailPass = settings?.gmail_app_password || process.env.GMAIL_APP_PASSWORD || ''

  if (!gmailUser || !gmailPass) {
    return NextResponse.json({ error: 'Gmail not configured' }, { status: 400 })
  }

  const dueFollowUps = await getDueFollowUps()
  const results: Array<{ id: string; status: string; lead: string }> = []

  for (const followUp of dueFollowUps) {
    const lead = followUp.leads
    if (!lead?.email) {
      // Skip if no email, mark as skipped
      await supabase.from('follow_up_sequences').update({ status: 'skipped' }).eq('id', followUp.id)
      results.push({ id: followUp.id, status: 'skipped', lead: lead?.name || 'unknown' })
      continue
    }

    // Check if lead has replied (status = 'replied'), if so cancel
    if (lead.status === 'replied' || lead.status === 'converted') {
      await cancelFollowUps(lead.id)
      results.push({ id: followUp.id, status: 'cancelled_replied', lead: lead.name })
      continue
    }

    // Get template
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_type', followUp.template_type)
      .eq('is_default', true)
      .limit(1)
      .single()

    if (!template) {
      results.push({ id: followUp.id, status: 'no_template', lead: lead.name })
      continue
    }

    // Process template variables
    const firstName = lead.name?.split(' ')[0] || 'there'
    const scoreLabel = lead.score != null
      ? (lead.score < 40 ? 'critical' : lead.score < 60 ? 'needs improvement' : 'decent')
      : 'unknown'

    // Get audit issues
    const { data: audit } = await supabase
      .from('audits')
      .select('issues')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const issues = audit?.issues || []
    const issuesHtml = issues.slice(0, 3).map((i: string) => `<li style="margin-bottom:8px;color:#dc2626;">⚠ ${i}</li>`).join('')

    const vars: Record<string, string> = {
      business_name: lead.name || '',
      first_name: firstName,
      score: String(lead.score || 0),
      score_label: scoreLabel,
      issues_html: issuesHtml,
      issue_count: String(issues.length),
      extra_issues: issues.length > 3 ? `<p style="color:#6b7280;font-size:14px;">...and ${issues.length - 3} more issues.</p>` : '',
      sender_name: settings?.sender_name || 'Mubashir Khan',
      company_name: settings?.company_name || 'Customation',
      website: lead.website || '',
    }

    const subject = processTemplate(template.subject, vars)
    const html = processTemplate(template.body_html, vars)

    try {
      await sendEmail({
        to: lead.email,
        subject,
        html,
        user: gmailUser,
        pass: gmailPass,
        from: `"${vars.company_name}" <${gmailUser}>`,
      })

      // Update follow-up as sent
      await supabase.from('follow_up_sequences').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).eq('id', followUp.id)

      // Log email
      await supabase.from('email_logs').insert({
        lead_id: lead.id,
        subject,
        body: html,
        status: 'sent',
        sequence_step: followUp.sequence_step,
        sent_at: new Date().toISOString(),
      })

      results.push({ id: followUp.id, status: 'sent', lead: lead.name })

      // Rate limit: 5 sec between emails
      await new Promise(r => setTimeout(r, 5000))
    } catch (err: any) {
      results.push({ id: followUp.id, status: 'failed', lead: lead.name })
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
  })
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json()
  const supabase = getServiceSupabase()
  const { error } = await supabase.from('follow_up_sequences').update({ status }).eq('id', id)
  return NextResponse.json({ success: !error })
}
