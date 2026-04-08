import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export type Lead = {
  id: string
  name: string
  website: string
  phone: string | null
  email: string | null
  address: string | null
  category: string | null
  source_query: string | null
  score: number | null
  status: 'new' | 'contacted' | 'replied' | 'converted' | 'ignored'
  email_sent_at: string | null
  created_at: string
}

export type Audit = {
  id: string
  lead_id: string
  score: number
  load_time: number | null
  has_ssl: boolean
  has_mobile_viewport: boolean
  has_title: boolean
  has_meta_description: boolean
  has_h1: boolean
  has_og_tags: boolean
  has_analytics: boolean
  image_count: number
  content_length: number
  font_count: number
  issues: string[]
  raw_data: Record<string, unknown>
  created_at: string
}

export type EmailLog = {
  id: string
  lead_id: string
  subject: string
  body: string
  status: 'sent' | 'failed' | 'replied'
  sent_at: string
  created_at: string
}
