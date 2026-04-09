import { NextRequest, NextResponse } from 'next/server'
import { getDueFollowUps, processTemplate } from '@/lib/followups'
import { sendEmail } from '@/lib/emailer'
import { getServiceSupabase } from '@/lib/supabase'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceSupabase()

  // Get settings
  const { data: settings } = await supabase.from('settings').select('*').limit(1).single()
  const gmailUser = settings?.gmail_user || process.env.GMAIL_USER || ''
  const gmailPass = settings?.gmail_app_password || process.env.GMAIL_APP_PASSWORD || ''

  if (!gmailUser || !gmailPass) {
    return NextResponse.json({ error: 'Gmail not configured', followups: 0, retries: 0 })
  }

  // 1. Process follow-ups
  const dueFollowUps = await getDueFollowUps()
  let followupsSent = 0

  for (const followUp of dueFollowUps) {
    const lead = followUp.leads
    if (!lead?.email) {
      await supabase.from('follow_up_sequences').update({ status: 'skipped' }).eq('id', followUp.id)
      continue
    }

    if (lead.status === 'replied' || lead.status === 'converted' || lead.status === 'ignored') {
      await supabase.from('follow_up_sequences').update({ status: 'cancelled' }).eq('id', followUp.id)
      continue
    }

    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_type', followUp.template_type)
      .eq('is_default', true)
      .limit(1)
      .single()

    if (!template) continue

    const { data: audit } = await supabase
      .from('audits')
      .select('issues')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const issues = audit?.issues || []
    const vars: Record<string, string> = {
      business_name: lead.name || '',
      first_name: lead.name?.split(' ')[0] || 'there',
      score: String(lead.score || 0),
      score_label: lead.score != null ? (lead.score < 40 ? 'critical' : lead.score < 60 ? 'needs improvement' : 'decent') : 'unknown',
      issues_html: issues.slice(0, 3).map((i: string) => `<li style="margin-bottom:8px;color:#dc2626;">⚠ ${i}</li>`).join(''),
      issue_count: String(issues.length),
      extra_issues: issues.length > 3 ? `<p style="color:#6b7280;font-size:14px;">...and ${issues.length - 3} more issues.</p>` : '',
      sender_name: settings?.sender_name || 'Mubashir Khan',
      company_name: settings?.company_name || 'Customation',
    }

    try {
      await sendEmail({
        to: lead.email,
        subject: processTemplate(template.subject, vars),
        html: processTemplate(template.body_html, vars),
        user: gmailUser,
        pass: gmailPass,
        from: `"${vars.company_name}" <${gmailUser}>`,
      })

      await supabase.from('follow_up_sequences').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', followUp.id)
      await supabase.from('email_logs').insert({
        lead_id: lead.id, subject: processTemplate(template.subject, vars),
        body: processTemplate(template.body_html, vars), status: 'sent',
        sequence_step: followUp.sequence_step, sent_at: new Date().toISOString(),
      })

      followupsSent++
      await new Promise(r => setTimeout(r, 5000))
    } catch {}
  }

  // 2. Retry failed emails
  const yesterday = new Date(Date.now() - 86400000).toISOString()
  const { data: failedEmails } = await supabase
    .from('email_logs')
    .select('*, leads(email)')
    .eq('status', 'failed')
    .gte('created_at', yesterday)
    .limit(10)

  let retriesSent = 0
  for (const emailLog of failedEmails || []) {
    if (!emailLog.leads?.email) continue
    try {
      await sendEmail({
        to: emailLog.leads.email,
        subject: emailLog.subject,
        html: emailLog.body,
        user: gmailUser,
        pass: gmailPass,
      })
      await supabase.from('email_logs').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', emailLog.id)
      retriesSent++
      await new Promise(r => setTimeout(r, 5000))
    } catch {}
  }

  return NextResponse.json({
    followups_processed: dueFollowUps.length,
    followups_sent: followupsSent,
    retries_processed: (failedEmails || []).length,
    retries_sent: retriesSent,
  })
}
