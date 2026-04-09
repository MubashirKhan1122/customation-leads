import { getServiceSupabase } from './supabase'

export interface FollowUpConfig {
  step1_days: number // days after initial email
  step2_days: number // days after step 1
  step3_days: number // days after step 2 (breakup)
}

const DEFAULT_CONFIG: FollowUpConfig = {
  step1_days: 3,
  step2_days: 7,
  step3_days: 14,
}

// Schedule follow-ups after an initial email is sent
export async function scheduleFollowUps(
  leadId: string,
  emailLogId: string,
  config: FollowUpConfig = DEFAULT_CONFIG
) {
  const supabase = getServiceSupabase()
  const now = new Date()

  const followUps = [
    {
      lead_id: leadId,
      email_log_id: emailLogId,
      sequence_step: 1,
      scheduled_at: new Date(now.getTime() + config.step1_days * 86400000).toISOString(),
      status: 'pending',
      template_type: 'followup1',
    },
    {
      lead_id: leadId,
      email_log_id: emailLogId,
      sequence_step: 2,
      scheduled_at: new Date(now.getTime() + config.step2_days * 86400000).toISOString(),
      status: 'pending',
      template_type: 'followup2',
    },
    {
      lead_id: leadId,
      email_log_id: emailLogId,
      sequence_step: 3,
      scheduled_at: new Date(now.getTime() + config.step3_days * 86400000).toISOString(),
      status: 'pending',
      template_type: 'breakup',
    },
  ]

  const { error } = await supabase.from('follow_up_sequences').insert(followUps)
  if (error) console.error('Failed to schedule follow-ups:', error)
}

// Cancel pending follow-ups for a lead (e.g., when they reply)
export async function cancelFollowUps(leadId: string) {
  const supabase = getServiceSupabase()
  await supabase
    .from('follow_up_sequences')
    .update({ status: 'cancelled' })
    .eq('lead_id', leadId)
    .eq('status', 'pending')
}

// Get all pending follow-ups that are due
export async function getDueFollowUps() {
  const supabase = getServiceSupabase()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('follow_up_sequences')
    .select('*, leads(*)')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })

  if (error) {
    console.error('Failed to get due follow-ups:', error)
    return []
  }
  return data || []
}

// Process a template: replace variables
export function processTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  return result
}
