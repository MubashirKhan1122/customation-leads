// Smart Prospector: Finds businesses in Pakistan that need specific services
// Based on their website audit, it determines what to pitch them

export interface ServiceNeed {
  service: string
  priority: 'critical' | 'high' | 'medium'
  pitch: string
  icon: string
}

export function detectServiceNeeds(audit: {
  score: number
  has_ssl: boolean
  has_mobile_viewport: boolean
  has_title: boolean
  has_meta_description: boolean
  has_h1: boolean
  has_og_tags: boolean
  has_analytics: boolean
  load_time: number | null
  image_count: number
  content_length: number
  font_count: number
  issues: string[]
}): ServiceNeed[] {
  const needs: ServiceNeed[] = []

  // No website at all
  if (audit.score === 0) {
    needs.push({
      service: 'Website Design',
      priority: 'critical',
      pitch: 'They have no working website — pitch a full website build',
      icon: '🌐',
    })
    return needs
  }

  // Very bad score = needs full redesign
  if (audit.score < 30) {
    needs.push({
      service: 'Website Redesign',
      priority: 'critical',
      pitch: `Website scored ${audit.score}/100 — needs a complete redesign to compete online`,
      icon: '🎨',
    })
  }

  // No SSL
  if (!audit.has_ssl) {
    needs.push({
      service: 'SSL & Security',
      priority: 'critical',
      pitch: 'No SSL certificate — customers see "Not Secure" warning, losing trust and sales',
      icon: '🔒',
    })
  }

  // Not mobile friendly
  if (!audit.has_mobile_viewport) {
    needs.push({
      service: 'Mobile Optimization',
      priority: 'critical',
      pitch: '70%+ of Pakistani traffic is mobile — their site doesn\'t work on phones',
      icon: '📱',
    })
  }

  // Slow website
  if (audit.load_time && audit.load_time > 4) {
    needs.push({
      service: 'Speed Optimization',
      priority: 'high',
      pitch: `Site takes ${audit.load_time.toFixed(1)}s to load — losing 50%+ of visitors before it even opens`,
      icon: '⚡',
    })
  }

  // No SEO basics
  if (!audit.has_title || !audit.has_meta_description || !audit.has_h1) {
    const missing = []
    if (!audit.has_title) missing.push('title')
    if (!audit.has_meta_description) missing.push('meta description')
    if (!audit.has_h1) missing.push('heading')
    needs.push({
      service: 'SEO Setup',
      priority: 'high',
      pitch: `Missing ${missing.join(', ')} — invisible on Google, losing free organic traffic`,
      icon: '🔍',
    })
  }

  // No social media tags
  if (!audit.has_og_tags) {
    needs.push({
      service: 'Social Media Optimization',
      priority: 'medium',
      pitch: 'No Open Graph tags — looks unprofessional when shared on WhatsApp/Facebook/Instagram',
      icon: '📣',
    })
  }

  // No analytics
  if (!audit.has_analytics) {
    needs.push({
      service: 'Analytics & Tracking',
      priority: 'medium',
      pitch: 'No analytics installed — they have zero idea how many people visit their site or where they come from',
      icon: '📊',
    })
  }

  // Too many fonts / bloated
  if (audit.font_count > 5) {
    needs.push({
      service: 'Performance Optimization',
      priority: 'medium',
      pitch: `${audit.font_count} fonts loaded — site is bloated and slow, needs cleanup`,
      icon: '🧹',
    })
  }

  // Very little content
  if (audit.content_length < 500) {
    needs.push({
      service: 'Content Writing',
      priority: 'medium',
      pitch: 'Almost no text content — Google can\'t rank a site with nothing on it',
      icon: '✍️',
    })
  }

  // Score 30-60 = needs improvement
  if (audit.score >= 30 && audit.score < 60 && needs.length === 0) {
    needs.push({
      service: 'Website Improvement',
      priority: 'high',
      pitch: `Scored ${audit.score}/100 — decent foundation but multiple issues hurting their business`,
      icon: '🔧',
    })
  }

  return needs
}

// Pakistani cities with good OSM data coverage
export const PAKISTAN_CITIES = [
  { name: 'Karachi', lat: 24.8607, lng: 67.0011 },
  { name: 'Lahore', lat: 31.5204, lng: 74.3587 },
  { name: 'Islamabad', lat: 33.6844, lng: 73.0479 },
  { name: 'Rawalpindi', lat: 33.5651, lng: 73.0169 },
  { name: 'Faisalabad', lat: 31.4504, lng: 73.1350 },
  { name: 'Multan', lat: 30.1575, lng: 71.5249 },
  { name: 'Peshawar', lat: 34.0151, lng: 71.5249 },
  { name: 'Quetta', lat: 30.1798, lng: 66.9750 },
  { name: 'Hyderabad', lat: 25.3960, lng: 68.3578 },
  { name: 'Sialkot', lat: 32.4945, lng: 74.5229 },
]

// Business categories that typically need digital services
export const BUSINESS_CATEGORIES = [
  { label: 'Restaurants & Cafes', tags: ['["amenity"="restaurant"]', '["amenity"="cafe"]', '["amenity"="fast_food"]'] },
  { label: 'Salons & Beauty', tags: ['["shop"="hairdresser"]', '["shop"="beauty"]'] },
  { label: 'Doctors & Clinics', tags: ['["amenity"="clinic"]', '["amenity"="doctors"]', '["amenity"="dentist"]'] },
  { label: 'Hotels & Guest Houses', tags: ['["tourism"="hotel"]', '["tourism"="guest_house"]'] },
  { label: 'Gyms & Fitness', tags: ['["leisure"="fitness_centre"]', '["leisure"="sports_centre"]'] },
  { label: 'Shops & Retail', tags: ['["shop"="clothes"]', '["shop"="electronics"]', '["shop"="furniture"]'] },
  { label: 'Car Dealers & Repair', tags: ['["shop"="car"]', '["shop"="car_repair"]'] },
  { label: 'Schools & Education', tags: ['["amenity"="school"]', '["amenity"="college"]'] },
  { label: 'Real Estate', tags: ['["office"="estate_agent"]', '["shop"="estate_agent"]'] },
  { label: 'Pharmacies', tags: ['["amenity"="pharmacy"]'] },
]

// Get a pitch summary based on top needs
export function getPitchSummary(needs: ServiceNeed[]): string {
  if (needs.length === 0) return 'Website looks good — low priority lead'

  const critical = needs.filter(n => n.priority === 'critical')
  const high = needs.filter(n => n.priority === 'high')

  if (critical.length > 0) {
    return `🔥 HOT LEAD: Needs ${critical.map(n => n.service).join(' + ')}${high.length > 0 ? ` + ${high.length} more` : ''}`
  }
  if (high.length > 0) {
    return `⚠️ WARM LEAD: Needs ${high.map(n => n.service).join(' + ')}`
  }
  return `💡 OPPORTUNITY: Could use ${needs.map(n => n.service).join(', ')}`
}
