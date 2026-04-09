import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/emailer'
import { getServiceSupabase } from '@/lib/supabase'

export const maxDuration = 60

export async function POST() {
  const supabase = getServiceSupabase()

  // Get settings
  const { data: settings } = await supabase.from('settings').select('*').limit(1).single()
  const gmailUser = settings?.gmail_user || process.env.GMAIL_USER || ''
  const gmailPass = settings?.gmail_app_password || process.env.GMAIL_APP_PASSWORD || ''

  if (!gmailUser || !gmailPass) {
    return NextResponse.json({ error: 'Gmail not configured' })
  }

  // Get failed emails from last 24 hours
  const yesterday = new Date(Date.now() - 86400000).toISOString()
  const { data: failedEmails } = await supabase
    .from('email_logs')
    .select('*, leads(email)')
    .eq('status', 'failed')
    .gte('created_at', yesterday)
    .limit(20)

  const results: Array<{ id: string; status: string }> = []

  for (const emailLog of failedEmails || []) {
    if (!emailLog.leads?.email) continue

    try {
      await sendEmail({
        to: emailLog.leads.email,
        subject: emailLog.subject,
        html: emailLog.body,
        user: gmailUser,
        pass: gmailPass,
        from: `"${settings?.company_name || 'Customation'}" <${gmailUser}>`,
      })

      await supabase.from('email_logs').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).eq('id', emailLog.id)

      results.push({ id: emailLog.id, status: 'retried_success' })

      // Rate limit
      await new Promise(r => setTimeout(r, 5000))
    } catch {
      results.push({ id: emailLog.id, status: 'retry_failed' })
    }
  }

  return NextResponse.json({ retried: results.length, results })
}
