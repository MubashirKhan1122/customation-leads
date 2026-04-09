'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Zap, Loader2, MapPin, Globe, Mail, Phone, ChevronDown, ChevronRight, Target, AlertTriangle, CheckCircle, Search, Filter } from 'lucide-react'

interface ProspectResult {
  name: string
  website: string
  phone: string
  address: string
  city: string
  category: string
  emails: string[]
  score: number | null
  needs: Array<{ service: string; priority: string; pitch: string; icon: string }>
  pitchSummary: string
  processing: boolean
  processed: boolean
  saved: boolean
}

const CITIES = [
  { name: 'Karachi', lat: 24.8607, lng: 67.0011 },
  { name: 'Lahore', lat: 31.5204, lng: 74.3587 },
  { name: 'Islamabad', lat: 33.6844, lng: 73.0479 },
  { name: 'Rawalpindi', lat: 33.5651, lng: 73.0169 },
  { name: 'Faisalabad', lat: 31.4504, lng: 73.1350 },
  { name: 'Multan', lat: 30.1575, lng: 71.5249 },
  { name: 'Peshawar', lat: 34.0151, lng: 71.5249 },
  { name: 'Quetta', lat: 30.1798, lng: 66.9750 },
]

const CATEGORIES = [
  { label: 'Restaurants & Cafes', value: 'restaurants' },
  { label: 'Salons & Beauty', value: 'salons' },
  { label: 'Doctors & Clinics', value: 'clinics' },
  { label: 'Hotels', value: 'hotels' },
  { label: 'Gyms & Fitness', value: 'gyms' },
  { label: 'Shops & Retail', value: 'shops' },
  { label: 'Schools & Education', value: 'schools' },
  { label: 'Pharmacies', value: 'pharmacies' },
  { label: 'All Businesses', value: 'business' },
]

export default function ProspectPage() {
  const [selectedCities, setSelectedCities] = useState<string[]>(['Karachi', 'Lahore', 'Islamabad'])
  const [selectedCategory, setSelectedCategory] = useState('restaurants')
  const [results, setResults] = useState<ProspectResult[]>([])
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState('')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [filterPriority, setFilterPriority] = useState<string>('all')

  const stats = {
    total: results.length,
    withSite: results.filter(r => r.website).length,
    withEmail: results.filter(r => r.emails.length > 0).length,
    hotLeads: results.filter(r => r.needs.some(n => n.priority === 'critical')).length,
    processed: results.filter(r => r.processed).length,
  }

  const toggleCity = (city: string) => {
    setSelectedCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    )
  }

  const startScan = async () => {
    if (selectedCities.length === 0) return
    setScanning(true)
    setResults([])
    setProgress('Starting smart scan...')

    const allPlaces: ProspectResult[] = []

    // Step 1: Find businesses across all selected cities
    for (const cityName of selectedCities) {
      const city = CITIES.find(c => c.name === cityName)
      if (!city) continue

      setProgress(`Searching ${selectedCategory} in ${cityName}...`)

      try {
        const res = await fetch('/api/places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'find',
            query: `${selectedCategory} ${cityName}`,
            lat: city.lat,
            lng: city.lng,
          }),
        })
        const data = await res.json()

        if (data.places?.length > 0) {
          const cityResults: ProspectResult[] = data.places.map((p: any) => ({
            name: p.name,
            website: p.website || '',
            phone: p.phone || '',
            address: p.address || '',
            city: cityName,
            category: selectedCategory,
            emails: [],
            score: null,
            needs: [],
            pitchSummary: '',
            processing: false,
            processed: false,
            saved: false,
          }))
          allPlaces.push(...cityResults)
        }
      } catch {}
    }

    if (allPlaces.length === 0) {
      setProgress('No businesses found. Try different cities or categories.')
      setScanning(false)
      return
    }

    setResults(allPlaces)
    setProgress(`Found ${allPlaces.length} businesses across ${selectedCities.length} cities. Now analyzing who needs services...`)

    // Step 2: Process each business — scrape emails, audit, detect needs
    for (let i = 0; i < allPlaces.length; i++) {
      const place = allPlaces[i]

      setResults(prev => prev.map((r, idx) => idx === i ? { ...r, processing: true } : r))
      setProgress(`Analyzing ${i + 1}/${allPlaces.length}: ${place.name} (${place.city})...`)

      try {
        const res = await fetch('/api/prospect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            place: {
              name: place.name,
              website: place.website,
              phone: place.phone,
              address: place.address,
              category: place.category,
            },
            city: place.city,
            query: `${selectedCategory} ${place.city}`,
          }),
        })
        const data = await res.json()

        setResults(prev => prev.map((r, idx) =>
          idx === i ? {
            ...r,
            processing: false,
            processed: true,
            saved: data.saved || false,
            emails: data.emails || [],
            score: data.score ?? null,
            needs: data.needs || [],
            pitchSummary: data.pitchSummary || '',
          } : r
        ))
      } catch {
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, processing: false, processed: true } : r
        ))
      }
    }

    setProgress(`Scan complete! Found ${allPlaces.length} businesses. Check results below.`)
    setScanning(false)
  }

  const filtered = results.filter(r => {
    if (filterPriority === 'all') return true
    if (filterPriority === 'critical') return r.needs.some(n => n.priority === 'critical')
    if (filterPriority === 'high') return r.needs.some(n => n.priority === 'high' || n.priority === 'critical')
    if (filterPriority === 'with_email') return r.emails.length > 0
    if (filterPriority === 'with_site') return !!r.website
    return true
  })

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Target className="w-8 h-8 text-purple-400" />
          Smart Prospector
        </h1>
        <p className="text-gray-500 mt-1">Auto-find businesses in Pakistan that need your services</p>
      </div>

      {/* Config Panel */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cities */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Select Cities</label>
            <div className="flex flex-wrap gap-2">
              {CITIES.map(city => (
                <button key={city.name} onClick={() => toggleCity(city.name)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    selectedCities.includes(city.name)
                      ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                      : 'bg-white/5 text-gray-400 border border-transparent hover:border-gray-600'
                  }`}>
                  <MapPin className="w-3 h-3 inline mr-1" />{city.name}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Business Type</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.value} onClick={() => setSelectedCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    selectedCategory === cat.value
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'bg-white/5 text-gray-400 border border-transparent hover:border-gray-600'
                  }`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Will scan {selectedCities.length} cities for {CATEGORIES.find(c => c.value === selectedCategory)?.label || selectedCategory}
          </p>
          <button onClick={startScan} disabled={scanning || selectedCities.length === 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {scanning ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</>
            ) : (
              <><Zap className="w-4 h-4" /> Start Smart Scan</>
            )}
          </button>
        </div>
      </div>

      {/* Progress */}
      {progress && (
        <div className="card p-4 mb-4 flex items-center gap-3">
          {scanning && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
          <span className="text-sm text-gray-300">{progress}</span>
        </div>
      )}

      {/* Stats Bar */}
      {results.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{stats.total}</div>
                <div className="text-[10px] text-gray-500 uppercase">Found</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-400">{stats.withSite}</div>
                <div className="text-[10px] text-gray-500 uppercase">Have Website</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-400">{stats.withEmail}</div>
                <div className="text-[10px] text-gray-500 uppercase">Email Found</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-red-400">{stats.hotLeads}</div>
                <div className="text-[10px] text-gray-500 uppercase">Hot Leads 🔥</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-400">{stats.processed}/{stats.total}</div>
                <div className="text-[10px] text-gray-500 uppercase">Analyzed</div>
              </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                className="input-field py-1.5 text-xs">
                <option value="all">All ({results.length})</option>
                <option value="critical">🔥 Critical Needs ({results.filter(r => r.needs.some(n => n.priority === 'critical')).length})</option>
                <option value="high">⚠️ High Priority ({results.filter(r => r.needs.some(n => n.priority === 'high' || n.priority === 'critical')).length})</option>
                <option value="with_email">📧 With Email ({results.filter(r => r.emails.length > 0).length})</option>
                <option value="with_site">🌐 With Website ({results.filter(r => !!r.website).length})</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((result, idx) => {
            const realIdx = results.indexOf(result)
            const isExpanded = expandedIdx === realIdx
            return (
              <div key={realIdx} className={`card transition-all ${
                result.needs.some(n => n.priority === 'critical') ? 'border-red-500/20' :
                result.needs.some(n => n.priority === 'high') ? 'border-yellow-500/20' : ''
              }`}>
                {/* Main Row */}
                <div className="p-4 cursor-pointer hover:bg-white/[0.02]" onClick={() => setExpandedIdx(isExpanded ? null : realIdx)}>
                  <div className="flex items-start gap-3">
                    {/* Expand icon */}
                    <div className="mt-0.5 flex-shrink-0">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-white truncate">{result.name}</h3>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">{result.city}</span>
                        {result.processing && <Loader2 className="w-3 h-3 animate-spin text-purple-400" />}
                        {result.saved && <CheckCircle className="w-3 h-3 text-green-400" />}
                      </div>

                      {/* Pitch summary */}
                      {result.pitchSummary && (
                        <p className={`text-xs mb-1.5 ${
                          result.pitchSummary.includes('HOT') ? 'text-red-400 font-medium' :
                          result.pitchSummary.includes('WARM') ? 'text-yellow-400' :
                          'text-gray-400'
                        }`}>
                          {result.pitchSummary}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {result.website && (
                          <a href={result.website} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}
                            className="hover:text-purple-400 truncate max-w-[200px]">
                            <Globe className="w-3 h-3 inline" /> {result.website.replace(/https?:\/\//, '')}
                          </a>
                        )}
                        {!result.website && <span className="text-gray-600"><Globe className="w-3 h-3 inline" /> No website</span>}
                        {result.phone && <span><Phone className="w-3 h-3 inline" /> {result.phone}</span>}
                        {result.emails.length > 0 && (
                          <span className="text-green-400"><Mail className="w-3 h-3 inline" /> {result.emails[0]}</span>
                        )}
                      </div>
                    </div>

                    {/* Score + Service tags */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Service need tags */}
                      <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                        {result.needs.slice(0, 3).map((need, ni) => (
                          <span key={ni} className={`text-[10px] px-1.5 py-0.5 rounded ${
                            need.priority === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            need.priority === 'high' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {need.icon} {need.service}
                          </span>
                        ))}
                      </div>

                      {/* Score */}
                      {result.score != null && (
                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                          result.score >= 70 ? 'border-green-500/50 text-green-400' :
                          result.score >= 40 ? 'border-yellow-500/50 text-yellow-400' :
                          'border-red-500/50 text-red-400'
                        }`}>{result.score}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && result.processed && (
                  <div className="px-4 pb-4 pt-0 border-t border-[var(--border)] mt-0">
                    <div className="pt-4">
                      {result.needs.length > 0 ? (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3">Services They Need</h4>
                          <div className="space-y-2">
                            {result.needs.map((need, ni) => (
                              <div key={ni} className={`p-3 rounded-lg border ${
                                need.priority === 'critical' ? 'bg-red-500/5 border-red-500/20' :
                                need.priority === 'high' ? 'bg-yellow-500/5 border-yellow-500/20' :
                                'bg-blue-500/5 border-blue-500/20'
                              }`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span>{need.icon}</span>
                                  <span className="text-sm font-medium text-white">{need.service}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${
                                    need.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                                    need.priority === 'high' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-blue-500/20 text-blue-400'
                                  }`}>{need.priority}</span>
                                </div>
                                <p className="text-xs text-gray-400">{need.pitch}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : result.website ? (
                        <p className="text-sm text-gray-500">Website looks decent — lower priority lead.</p>
                      ) : (
                        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                          <span className="text-sm text-red-400">🌐 No website at all — pitch them a full website build!</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !scanning && (
        <div className="card p-10 text-center">
          <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">Smart Prospector</h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto mb-4">
            Select cities and a business type above, then click &quot;Start Smart Scan&quot;.
            We&apos;ll automatically find businesses, audit their websites, and tell you
            exactly what services to pitch each one.
          </p>
          <div className="text-xs text-gray-600 space-y-1">
            <p>🔍 Finds businesses across multiple Pakistani cities</p>
            <p>🌐 Checks who has a website and who doesn&apos;t</p>
            <p>📊 Audits each website for speed, SEO, mobile, SSL</p>
            <p>🎯 Tells you exactly what service each business needs</p>
            <p>📧 Auto-scrapes emails for cold outreach</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
