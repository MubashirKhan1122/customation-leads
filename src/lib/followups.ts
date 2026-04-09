import { getServiceSupabase } from './supabase'

export interface FollowUpConfig {
  step1_days: number
  step2_days: number
  step3_days: number
}

const DEFAULT_CONFIG: FollowUpConfig = {
  step1_days: 3,
  step2_days: 7,
  step3_days: 14,
}

export async function scheduleFollowUps(
  leadId: string,
  emailLogId: string,
  config: FollowUpConfig = DEFAULT_CONFIG
) {
  try {
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

    await supabase.from('follow_up_sequences').insert(followUps)
  } catch {
    // Silently fail if table doesn't exist yet — email still sends
  }
}

export async function cancelFollowUps(leadId: string) {
  try {
    const supabase = getServiceSupabase()
    await supabase
      .from('follow_up_sequences')
      .update({ status: 'cancelled' })
      .eq('lead_id', leadId)
      .eq('status', 'pending')
  } catch {}
}

export async function getDueFollowUps() {
  try {
    const supabase = getServiceSupabase()
    const now = new Date().toISOString()

    const { data } = await supabase
      .from('follow_up_sequences')
      .select('*, leads(*)')
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })

    return data || []
  } catch {
    return []
  }
}

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
