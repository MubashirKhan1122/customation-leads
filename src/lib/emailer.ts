import nodemailer from 'nodemailer'

export function createTransport(user: string, pass: string) {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
}

export function generateEmailTemplate(
  leadName: string,
  issues: string[],
  score: number,
  senderName: string = 'Mubashir Khan',
  companyName: string = 'Customation',
  toEmail: string = ''
): { subject: string; html: string } {
  const topIssues = issues.slice(0, 3)
  const scoreLabel = score < 40 ? 'critical' : score < 60 ? 'needs improvement' : 'decent but could be better'

  const subject = `${leadName} - Your website scored ${score}/100 (free audit inside)`

  const issueList = topIssues
    .map(i => `<li style="margin-bottom:8px;color:#dc2626;">&#x26A0; ${i}</li>`)
    .join('')

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
      <p>Hi ${leadName.split(' ')[0] || 'there'},</p>

      <p>I just ran a quick audit on your website and found some issues that could be costing you customers.</p>

      <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;margin:16px 0;border-radius:4px;">
        <strong>Your Website Score: ${score}/100</strong> (${scoreLabel})
      </div>

      <p><strong>Key issues found:</strong></p>
      <ul style="padding-left:20px;">${issueList}</ul>

      ${issues.length > 3 ? `<p style="color:#6b7280;font-size:14px;">...and ${issues.length - 3} more issues found.</p>` : ''}

      <p>These are quick fixes that can dramatically improve your online presence and help you get more customers from Google.</p>

      <p>Would you be open to a quick 15-minute call this week? I can walk you through the full report and show you exactly what to fix — no strings attached.</p>

      <p>Best,<br/>
      <strong>${senderName}</strong><br/>
      ${companyName}<br/>
      <span style="color:#6b7280;font-size:13px;">Design & Tech Agency</span></p>
      {{tracking_pixel}}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 16px;" />
      <p style="color:#9ca3af;font-size:11px;text-align:center;">
        You're receiving this because we found your business online.<br/>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://customation-leads.vercel.app'}/unsubscribe?email=${encodeURIComponent(toEmail)}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>
  `

  return { subject, html }
}

export async function sendEmail(params: {
  to: string
  subject: string
  html: string
  user: string
  pass: string
  from?: string
}) {
  const transport = createTransport(params.user, params.pass)

  const result = await transport.sendMail({
    from: params.from || `"Customation" <${params.user}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
  })

  return result
}
