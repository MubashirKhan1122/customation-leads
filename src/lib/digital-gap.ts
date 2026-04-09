// Digital Gap Finder: Finds businesses that are still paper-based / non-digital
// These are the BEST leads for selling websites, software, automation

// Industries that are KNOWN to still run on paper/fax/phone
export const PAPER_INDUSTRIES = [
  {
    label: 'Law Firms & Lawyers',
    icon: '⚖️',
    tags: ['["office"="lawyer"]', '["amenity"="courthouse"]'],
    pitch: 'Most law firms still use paper files, fax machines, and manual billing. Pitch: case management software, client portal, online intake forms, digital document signing.',
  },
  {
    label: 'Medical & Dental Clinics',
    icon: '🏥',
    tags: ['["amenity"="clinic"]', '["amenity"="doctors"]', '["amenity"="dentist"]', '["healthcare"="doctor"]'],
    pitch: 'Many clinics still use paper patient records and phone-only appointments. Pitch: online booking system, patient portal, digital records, telemedicine.',
  },
  {
    label: 'Plumbers & HVAC',
    icon: '🔧',
    tags: ['["craft"="plumber"]', '["craft"="hvac"]', '["shop"="trade"]'],
    pitch: 'Trade businesses rarely have websites. They rely on word-of-mouth and Yellow Pages. Pitch: simple website, Google Business listing, online booking, invoice automation.',
  },
  {
    label: 'Accountants & Tax',
    icon: '📊',
    tags: ['["office"="accountant"]', '["office"="tax_advisor"]', '["office"="financial"]'],
    pitch: 'Small accounting firms still use paper ledgers and manual tax filing. Pitch: client portal, document upload, digital invoicing, automated bookkeeping.',
  },
  {
    label: 'Real Estate Agents',
    icon: '🏠',
    tags: ['["office"="estate_agent"]', '["shop"="estate_agent"]'],
    pitch: 'Many agents still use paper listings and manual property management. Pitch: property listing website, virtual tours, CRM, automated email campaigns.',
  },
  {
    label: 'Auto Repair & Mechanics',
    icon: '🚗',
    tags: ['["shop"="car_repair"]', '["shop"="car"]', '["craft"="automotive_repair"]'],
    pitch: 'Most auto shops use paper work orders and phone bookings. Pitch: online booking, digital invoices, customer reminders, review management.',
  },
  {
    label: 'Dry Cleaners & Laundry',
    icon: '👔',
    tags: ['["shop"="dry_cleaning"]', '["shop"="laundry"]'],
    pitch: 'Dry cleaners use paper tickets and no online presence. Pitch: order tracking app, pickup scheduling, SMS notifications, simple website.',
  },
  {
    label: 'Pharmacies',
    icon: '💊',
    tags: ['["amenity"="pharmacy"]', '["healthcare"="pharmacy"]'],
    pitch: 'Many pharmacies still use paper prescriptions and manual inventory. Pitch: online refill requests, inventory management, delivery scheduling.',
  },
  {
    label: 'Construction & Contractors',
    icon: '🏗️',
    tags: ['["craft"="carpenter"]', '["craft"="electrician"]', '["craft"="painter"]', '["office"="construction_company"]'],
    pitch: 'Construction companies run on paper estimates, faxed contracts, manual scheduling. Pitch: project management tool, digital estimates, online portfolio.',
  },
  {
    label: 'Funeral Homes',
    icon: '🕊️',
    tags: ['["amenity"="funeral_hall"]', '["shop"="funeral_directors"]'],
    pitch: 'Funeral homes are one of the least digitized industries. Pitch: dignified website, online obituaries, arrangement scheduling, digital payments.',
  },
  {
    label: 'Insurance Agents',
    icon: '🛡️',
    tags: ['["office"="insurance"]'],
    pitch: 'Local insurance agents still use paper applications and fax claims. Pitch: client portal, quote calculator, digital claims, automated renewals.',
  },
  {
    label: 'Veterinary Clinics',
    icon: '🐾',
    tags: ['["amenity"="veterinary"]'],
    pitch: 'Many vet clinics use paper records and phone-only booking. Pitch: online appointment booking, pet health records portal, automated reminders.',
  },
  {
    label: 'Bakeries & Food Shops',
    icon: '🍞',
    tags: ['["shop"="bakery"]', '["shop"="butcher"]', '["shop"="greengrocer"]'],
    pitch: 'Local food shops have zero online presence. Pitch: website with menu, online ordering, delivery system, social media management.',
  },
  {
    label: 'Tailors & Alterations',
    icon: '🧵',
    tags: ['["craft"="tailor"]', '["shop"="tailor"]', '["shop"="sewing"]'],
    pitch: 'Tailors use paper measurements and phone orders only. Pitch: online booking, measurement forms, portfolio website, order tracking.',
  },
  {
    label: 'Printing & Copy Shops',
    icon: '🖨️',
    tags: ['["shop"="copyshop"]', '["shop"="printing"]'],
    pitch: 'Ironic — print shops often lack websites themselves. Pitch: online file upload, order tracking, price calculator, website.',
  },
]

// Detect how "digital" a business is based on their audit
export function detectDigitalGap(audit: {
  score: number
  has_ssl: boolean
  has_mobile_viewport: boolean
  has_analytics: boolean
  has_og_tags: boolean
  load_time: number | null
  content_length: number
} | null, hasWebsite: boolean, hasEmail: boolean): {
  digitalScore: number // 0-100: 0 = completely paper-based, 100 = fully digital
  gapLevel: 'stone-age' | 'paper-heavy' | 'semi-digital' | 'mostly-digital'
  gaps: string[]
  services: string[]
} {
  let digitalScore = 0
  const gaps: string[] = []
  const services: string[] = []

  if (!hasWebsite) {
    gaps.push('No website at all — completely invisible online')
    gaps.push('Customers can\'t find them on Google')
    gaps.push('Likely relying on word-of-mouth, paper flyers, or Yellow Pages')
    services.push('Website Design & Development')
    services.push('Google Business Profile Setup')
    services.push('Social Media Presence')
    return { digitalScore: 5, gapLevel: 'stone-age', gaps, services }
  }

  // Has website — check quality
  digitalScore += 20 // Basic website exists

  if (!hasEmail) {
    gaps.push('No public email — customers must call or visit in person')
    services.push('Contact Form & Email Setup')
  } else {
    digitalScore += 10
  }

  if (audit) {
    if (!audit.has_ssl) {
      gaps.push('No SSL — website shows "Not Secure" warning')
      services.push('SSL Certificate & Security')
    } else {
      digitalScore += 10
    }

    if (!audit.has_mobile_viewport) {
      gaps.push('Not mobile-friendly — broken on phones (70%+ of traffic)')
      services.push('Mobile-Responsive Redesign')
    } else {
      digitalScore += 15
    }

    if (!audit.has_analytics) {
      gaps.push('No analytics — zero data on visitors or customer behavior')
      services.push('Google Analytics Setup')
    } else {
      digitalScore += 10
    }

    if (!audit.has_og_tags) {
      gaps.push('No social sharing tags — looks broken when shared on WhatsApp/Facebook')
      services.push('Social Media Optimization')
    } else {
      digitalScore += 5
    }

    if (audit.load_time && audit.load_time > 5) {
      gaps.push(`Website takes ${audit.load_time.toFixed(1)}s to load — most visitors leave`)
      services.push('Speed Optimization')
    } else {
      digitalScore += 10
    }

    if (audit.content_length < 300) {
      gaps.push('Almost no content — not enough for Google to rank')
      services.push('Content Writing & SEO')
    } else {
      digitalScore += 10
    }

    if (audit.score < 40) {
      gaps.push('Website quality score is critically low')
      services.push('Complete Website Overhaul')
    } else {
      digitalScore += 10
    }
  }

  digitalScore = Math.min(100, digitalScore)

  const gapLevel = digitalScore <= 15 ? 'stone-age'
    : digitalScore <= 35 ? 'paper-heavy'
    : digitalScore <= 60 ? 'semi-digital'
    : 'mostly-digital'

  return { digitalScore, gapLevel, gaps, services }
}
