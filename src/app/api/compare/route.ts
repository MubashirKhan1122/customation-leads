import { NextRequest, NextResponse } from 'next/server'
import { auditWebsite } from '@/lib/auditor'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { url1, url2 } = await req.json()

  if (!url1 || !url2) {
    return NextResponse.json({ error: 'Both URLs required' }, { status: 400 })
  }

  const [audit1, audit2] = await Promise.allSettled([
    auditWebsite(url1),
    auditWebsite(url2),
  ])

  return NextResponse.json({
    site1: {
      url: url1,
      audit: audit1.status === 'fulfilled' ? audit1.value : null,
      error: audit1.status === 'rejected' ? audit1.reason?.message : null,
    },
    site2: {
      url: url2,
      audit: audit2.status === 'fulfilled' ? audit2.value : null,
      error: audit2.status === 'rejected' ? audit2.reason?.message : null,
    },
  })
}
