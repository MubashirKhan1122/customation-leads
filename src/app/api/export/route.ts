import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = getServiceSupabase()
  const type = req.nextUrl.searchParams.get('type') || 'leads'

  if (type === 'leads') {
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    const rows = (data || []).map(l => ({
      Name: l.name,
      Website: l.website,
      Email: l.email || '',
      Phone: l.phone || '',
      Address: l.address || '',
      Category: l.category || '',
      Score: l.score ?? '',
      Status: l.status,
      'Source Query': l.source_query || '',
      'Email Sent': l.email_sent_at || '',
      'Created At': l.created_at,
    }))
    return csvResponse(rows, 'leads-export.csv')
  }

  if (type === 'audits') {
    const { data } = await supabase.from('audits').select('*, leads(name, website)').order('created_at', { ascending: false })
    const rows = (data || []).map(a => ({
      Business: a.leads?.name || '',
      Website: a.leads?.website || '',
      Score: a.score,
      'Load Time': a.load_time?.toFixed(1) || '',
      SSL: a.has_ssl ? 'Yes' : 'No',
      Mobile: a.has_mobile_viewport ? 'Yes' : 'No',
      Title: a.has_title ? 'Yes' : 'No',
      'Meta Desc': a.has_meta_description ? 'Yes' : 'No',
      H1: a.has_h1 ? 'Yes' : 'No',
      'OG Tags': a.has_og_tags ? 'Yes' : 'No',
      Analytics: a.has_analytics ? 'Yes' : 'No',
      Images: a.image_count,
      'Content Length': a.content_length,
      Issues: (a.issues || []).join(' | '),
      'Created At': a.created_at,
    }))
    return csvResponse(rows, 'audits-export.csv')
  }

  if (type === 'emails') {
    const { data } = await supabase.from('email_logs').select('*, leads(name, email)').order('created_at', { ascending: false })
    const rows = (data || []).map(e => ({
      Business: e.leads?.name || '',
      'To Email': e.leads?.email || '',
      Subject: e.subject,
      Status: e.status,
      'Sequence Step': e.sequence_step || 0,
      'Sent At': e.sent_at || '',
      'Created At': e.created_at,
    }))
    return csvResponse(rows, 'emails-export.csv')
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

function csvResponse(rows: Record<string, any>[], filename: string) {
  if (rows.length === 0) {
    return new NextResponse('No data to export', { status: 200 })
  }

  const headers = Object.keys(rows[0])
  const csvLines = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = String(row[h] ?? '').replace(/"/g, '""')
        return `"${val}"`
      }).join(',')
    ),
  ]

  return new NextResponse(csvLines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
