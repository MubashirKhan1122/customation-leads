import { getServiceSupabase } from './supabase'

// Check if a lead with same website domain already exists
export async function isDuplicate(website: string): Promise<boolean> {
  if (!website) return false

  const supabase = getServiceSupabase()

  // Normalize the URL to domain
  let domain = website
  try {
    domain = new URL(website).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    domain = website.replace(/https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase()
  }

  // Check for existing lead with same domain
  const { data } = await supabase
    .from('leads')
    .select('id')
    .or(`website.ilike.%${domain}%`)
    .limit(1)

  return (data?.length || 0) > 0
}

// Get duplicate count for a batch of websites
export async function filterDuplicates(websites: string[]): Promise<Set<string>> {
  const supabase = getServiceSupabase()
  const duplicates = new Set<string>()

  const { data: existingLeads } = await supabase
    .from('leads')
    .select('website')
    .not('website', 'eq', '')

  if (!existingLeads) return duplicates

  const existingDomains = new Set(
    existingLeads.map(l => {
      try {
        return new URL(l.website).hostname.replace(/^www\./, '').toLowerCase()
      } catch {
        return l.website.replace(/https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase()
      }
    })
  )

  for (const website of websites) {
    try {
      const domain = new URL(website).hostname.replace(/^www\./, '').toLowerCase()
      if (existingDomains.has(domain)) duplicates.add(website)
    } catch {}
  }

  return duplicates
}
