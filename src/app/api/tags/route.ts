import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

// PATCH: update tags for a lead
export async function PATCH(req: NextRequest) {
  const { lead_id, tags } = await req.json()
  const supabase = getServiceSupabase()

  const { error } = await supabase
    .from('leads')
    .update({ tags })
    .eq('id', lead_id)

  return NextResponse.json({ success: !error, error: error?.message })
}
