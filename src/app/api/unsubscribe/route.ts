import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { cancelFollowUps } from '@/lib/followups'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ success: false, error: 'No email' })

  const supabase = getServiceSupabase()

  // Mark lead as 'ignored' and cancel all follow-ups
  const { data: leads } = await supabase
    .from('leads')
    .select('id')
    .eq('email', email.toLowerCase())

  if (leads) {
    for (const lead of leads) {
      await supabase.from('leads').update({ status: 'ignored' }).eq('id', lead.id)
      await cancelFollowUps(lead.id)
    }
  }

  return NextResponse.json({ success: true })
}
