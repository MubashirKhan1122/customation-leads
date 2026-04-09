import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

// GET: Tracking pixel (1x1 transparent gif)
export async function GET(req: NextRequest) {
  const emailId = req.nextUrl.searchParams.get('id')
  const action = req.nextUrl.searchParams.get('a') || 'open'

  if (emailId) {
    const supabase = getServiceSupabase()

    if (action === 'open') {
      // Record email open
      await supabase.from('email_logs').update({
        status: 'opened',
      }).eq('id', emailId).eq('status', 'sent')
    }

    if (action === 'click') {
      // Record click
      await supabase.from('email_logs').update({
        status: 'clicked',
      }).eq('id', emailId)
    }
  }

  // Return 1x1 transparent GIF
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
  return new NextResponse(gif, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
