import { NextRequest, NextResponse } from 'next/server'
import { generateEmailTemplate, sendEmail } from '@/lib/emailer'
import { getServiceSupabase } from '@/lib/supabase'
import { scheduleFollowUps } from '@/lib/followups'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = getServiceSupabase()

  // Get settings
  const { data: settings } = await supabase.from('settings').select('*').limit(1).single()
  const senderName = settings?.sender_name || 'Mubashir Khan'
  const companyName = settings?.company_name || 'Customation'
  const gmailUser = settings?.gmail_user || process.env.GMAIL_USER || ''
  const gmailPass = settings?.gmail_app_password || process.env.GMAIL_APP_PASSWORD || ''

  if (body.action === 'preview') {
    const { subject, html } = generateEmailTemplate(
      body.lead_name,
      body.issues || [],
      body.score || 0,
      senderName,
      companyName,
    )
    return NextResponse.json({ subject, html })
  }

  if (body.action === 'send') {
    if (!gmailUser || !gmailPass) {
      return NextResponse.json({ success: false, error: 'Gmail not configured. Go to Settings to set up.' })
    }

    const { subject, html: rawHtml } = generateEmailTemplate(
      body.lead_name,
      body.issues || [],
      body.score || 0,
      senderName,
      companyName,
    )

    // Insert email log first with 'pending' status to get the ID
    const { data: emailLog } = await supabase.from('email_logs').insert({
      lead_id: body.lead_id,
      subject,
      body: rawHtml,
      status: 'pending',
    }).select('id').single()

    // Replace tracking pixel placeholder with actual tracking pixel
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://customation-leads.vercel.app'
    const html = emailLog
      ? rawHtml.replace('{{tracking_pixel}}', `<img src="${appUrl}/api/track?id=${emailLog.id}&a=open" width="1" height="1" style="display:none" />`)
      : rawHtml.replace('{{tracking_pixel}}', '')

    try {
      await sendEmail({
        to: body.to,
        subject,
        html,
        user: gmailUser,
        pass: gmailPass,
        from: `"${companyName}" <${gmailUser}>`,
      })

      // Update email log to sent
      if (emailLog) {
        await supabase.from('email_logs').update({
          status: 'sent',
          body: html,
          sent_at: new Date().toISOString(),
        }).eq('id', emailLog.id)
      }

      // Schedule follow-up sequence
      if (emailLog) {
        await scheduleFollowUps(body.lead_id, emailLog.id)
      }

      // Update lead status
      await supabase.from('leads').update({
        status: 'contacted',
        email_sent_at: new Date().toISOString(),
      }).eq('id', body.lead_id)

      return NextResponse.json({ success: true })
    } catch (error: any) {
      // Update email log to failed
      if (emailLog) {
        await supabase.from('email_logs').update({
          status: 'failed',
        }).eq('id', emailLog.id)
      } else {
        await supabase.from('email_logs').insert({
          lead_id: body.lead_id,
          subject,
          body: html,
          status: 'failed',
        })
      }

      return NextResponse.json({ success: false, error: error.message })
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
