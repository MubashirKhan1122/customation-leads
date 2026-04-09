import { NextRequest, NextResponse } from 'next/server'
import { auditWebsite } from '@/lib/auditor'
import { getServiceSupabase } from '@/lib/supabase'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const { url, email } = await req.json()

  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  try {
    const audit = await auditWebsite(url)

    // If email provided, capture as inbound lead
    if (email) {
      const supabase = getServiceSupabase()

      let domain = url
      try { domain = new URL(url).hostname } catch {}

      await supabase.from('leads').insert({
        name: domain,
        website: url,
        email: email,
        source_query: 'free-audit-tool',
        score: audit.score,
        status: 'new',
        category: 'inbound',
      })
    }

    return NextResponse.json({ audit })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
