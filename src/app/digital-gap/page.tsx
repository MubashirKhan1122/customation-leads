'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Search, Loader2, MapPin, Globe, Mail, Phone, Zap, AlertTriangle, CheckCircle, Filter, XCircle } from 'lucide-react'
import { PAPER_INDUSTRIES } from '@/lib/digital-gap'

interface GapResult {
  name: string
  website: string
  phone: string
  fax: string
  email: string
  address: string
  hasFax: boolean
  // After analysis
  scrapedEmails?: string[]
  score?: number | null
  gap?: {
    digitalScore: number
    gapLevel: string
    gaps: string[]
    services: string[]
  }
  processing?: boolean
  processed?: boolean
  saved?: boolean
  duplicate?: boolean
}

export default function DigitalGapPage() {
  const [selectedIndustry, setSelectedIndustry] = useState<number | null>(null)
  const [cityInput, setCityInput] = useState('')
  const [citySearching, setCitySearching] = useState(false)
  const [cities, setCities] = useState<Array<{ name: string; lat: number; lng: number }>>([])
  const [citySuggestions, setCitySuggestions] = useState<Array<{ name: string; lat: number; lng: number }>>([])
  const [results, setResults] = useState<GapResult[]>([])
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const [filterGap, setFilterGap] = useState('all')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const stats = {
    total: results.length,
    noWebsite: results.filter(r => !r.website).length,
    hasFax: results.filter(r => r.hasFax).length,
    stoneAge: results.filter(r => r.gap?.gapLevel === 'stone-age').length,
    paperHeavy: results.filter(r => r.gap?.gapLevel === 'paper-heavy').length,
    withContact: results.filter(r => r.phone || r.email || (r.scrapedEmails && r.scrapedEmails.length > 0)).length,
    processed: results.filter(r => r.processed).length,
  }

  const searchCity = async () => {
    if (!cityInput.trim()) return
    setCitySearching(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityInput)}&format=json&limit=5`, {
        headers: { 'User-Agent': 'CustomationLeadMachine/1.0' }
      })
      const data = await res.json()
      setCitySuggestions(data.map((d: any) => ({
        name: d.display_name.split(',').slice(0, 2).join(',').trim(),
        lat: parseFloat(d.lat),
        lng: parseFloat(d.lon),
      })))
    } catch {}
    setCitySearching(false)
  }

  const addCity = (city: { name: string; lat: number; lng: number }) => {
    if (!cities.find(c => c.name === city.name)) setCities(prev => [...prev, city])
    setCitySuggestions([])
    setCityInput('')
  }

  const startScan = async () => {
    if (!selectedIndustry && selectedIndustry !== 0) return
    if (cities.length === 0) return

    const industry = PAPER_INDUSTRIES[selectedIndustry]
    setScanning(true)
    setResults([])
    setProgress(`Searching for ${industry.label} across ${cities.length} cities...`)

    const allPlaces: GapResult[] = []

    for (const city of cities) {
      setProgress(`Searching ${industry.label} in ${city.name}...`)
      try {
        const res = await fetch('/api/digital-gap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'find',
            lat: city.lat,
            lng: city.lng,
            tags: industry.tags,
          }),
        })
        const data = await res.json()
        if (data.places?.length > 0) {
          allPlaces.push(...data.places.map((p: any) => ({
            ...p,
            processing: false,
            processed: false,
          })))
        }
      } catch {}
    }

    if (allPlaces.length === 0) {
      setProgress('No businesses found. Try different cities or industries.')
      setScanning(false)
      return
    }

    setResults(allPlaces)
    setProgress(`Found ${allPlaces.length} businesses (${allPlaces.filter(p => !p.website).length} without website, ${allPlaces.filter(p => p.hasFax).length} with fax). Click "Analyze All" to check digital gaps.`)
    setScanning(false)
  }

  const analyzeAll = async () => {
    if (selectedIndustry === null) return
    const industry = PAPER_INDUSTRIES[selectedIndustry]
    setProcessing(true)

    for (let i = 0; i < results.length; i++) {
      const place = results[i]
      setResults(prev => prev.map((r, idx) => idx === i ? { ...r, processing: true } : r))
      setProgress(`Analyzing ${i + 1}/${results.length}: ${place.name}...`)

      try {
        const res = await fetch('/api/digital-gap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'analyze',
            place,
            industry: industry.label,
            city: cities.map(c => c.name).join(', '),
          }),
        })
        const data = await res.json()
        setResults(prev => prev.map((r, idx) =>
          idx === i ? {
            ...r,
            processing: false,
            processed: true,
            saved: data.saved || false,
            duplicate: data.duplicate || false,
            scrapedEmails: data.emails || [],
            score: data.score ?? null,
            gap: data.gap || null,
          } : r
        ))
      } catch {
        setResults(prev => prev.map((r, idx) => idx === i ? { ...r, processing: false, processed: true } : r))
      }
    }

    setProgress(`Done! Analyzed ${results.length} businesses. Check the results below.`)
    setProcessing(false)
  }

  const filtered = results.filter(r => {
    if (filterGap === 'all') return true
    if (filterGap === 'no-website') return !r.website
    if (filterGap === 'has-fax') return r.hasFax
    if (filterGap === 'stone-age') return r.gap?.gapLevel === 'stone-age'
    if (filterGap === 'paper-heavy') return r.gap?.gapLevel === 'paper-heavy'
    if (filterGap === 'has-contact') return r.phone || r.email || (r.scrapedEmails && r.scrapedEmails.length > 0)
    return true
  })

  const gapColor = (level: string) => {
    switch (level) {
      case 'stone-age': return 'text-red-400 bg-red-500/10 border-red-500/20'
      case 'paper-heavy': return 'text-orange-400 bg-orange-500/10 border-orange-500/20'
      case 'semi-digital': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'mostly-digital': return 'text-green-400 bg-green-500/10 border-green-500/20'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    }
  }

  const gapLabel = (level: string) => {
    switch (level) {
      case 'stone-age': return '🪨 Stone Age'
      case 'paper-heavy': return '📄 Paper Heavy'
      case 'semi-digital': return '⚡ Semi-Digital'
      case 'mostly-digital': return '✅ Mostly Digital'
      default: return level
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span className="text-3xl">📠</span> Digital Gap Finder
        </h1>
        <p className="text-gray-500 mt-1">Find businesses still running on paper, fax, and phone — your hottest leads for digital services</p>
      </div>

      {/* Config */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Industry Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Select Paper-Based Industry</label>
            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
              {PAPER_INDUSTRIES.map((ind, i) => (
                <button key={i} onClick={() => setSelectedIndustry(i)}
                  className={`text-left p-3 rounded-lg text-sm transition-all ${
                    selectedIndustry === i
                      ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                      : 'bg-white/5 text-gray-400 border border-transparent hover:border-gray-600'
                  }`}>
                  <span className="text-lg mr-2">{ind.icon}</span>
                  <span className="text-xs">{ind.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* City Search */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Search Cities (Worldwide)</label>
            <div className="flex gap-2 mb-3">
              <input type="text" value={cityInput} onChange={e => setCityInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchCity()}
                placeholder="London, New York, Karachi..."
                className="input-field flex-1 text-sm py-2" />
              <button onClick={searchCity} disabled={citySearching} className="btn-secondary text-sm px-4 disabled:opacity-50">
                {citySearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </button>
            </div>
            {citySuggestions.length > 0 && (
              <div className="mb-3 space-y-1">
                {citySuggestions.map((s, i) => (
                  <button key={i} onClick={() => addCity(s)}
                    className="w-full text-left text-sm px-3 py-2 rounded-lg bg-white/5 hover:bg-purple-500/10 text-gray-300 hover:text-purple-400 transition-all truncate">
                    <MapPin className="w-3 h-3 inline mr-2" />{s.name}
                  </button>
                ))}
              </div>
            )}
            {/* Quick cities */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                { name: 'London', lat: 51.5074, lng: -0.1278 },
                { name: 'New York', lat: 40.7128, lng: -74.0060 },
                { name: 'Dubai', lat: 25.2048, lng: 55.2708 },
                { name: 'Karachi', lat: 24.8607, lng: 67.0011 },
                { name: 'Toronto', lat: 43.6532, lng: -79.3832 },
                { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
                { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
                { name: 'Berlin', lat: 52.52, lng: 13.405 },
              ].map(c => (
                <button key={c.name} onClick={() => addCity(c)}
                  className="text-[10px] px-2 py-1 rounded bg-white/5 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 transition-all">
                  {c.name}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {cities.map(c => (
                <span key={c.name} className="px-3 py-1.5 rounded-lg text-sm bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center gap-2">
                  <MapPin className="w-3 h-3" />{c.name}
                  <button onClick={() => setCities(prev => prev.filter(x => x.name !== c.name))} className="hover:text-red-400">&times;</button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Industry pitch preview */}
        {selectedIndustry !== null && (
          <div className="mt-4 p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
            <p className="text-sm text-purple-300">{PAPER_INDUSTRIES[selectedIndustry].icon} <strong>Why {PAPER_INDUSTRIES[selectedIndustry].label}?</strong></p>
            <p className="text-xs text-gray-400 mt-1">{PAPER_INDUSTRIES[selectedIndustry].pitch}</p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {selectedIndustry !== null ? `${PAPER_INDUSTRIES[selectedIndustry].label}` : 'Select an industry'} · {cities.length} cities
          </p>
          <button onClick={startScan} disabled={scanning || selectedIndustry === null || cities.length === 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {scanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</> : <><Search className="w-4 h-4" /> Find Paper-Based Businesses</>}
          </button>
        </div>
      </div>

      {/* Progress */}
      {progress && (
        <div className="card p-4 mb-4 flex items-center gap-3">
          {(scanning || processing) && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
          <span className="text-sm text-gray-300">{progress}</span>
        </div>
      )}

      {/* Stats + Analyze Button */}
      {results.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{stats.total}</div>
                <div className="text-[10px] text-gray-500">Found</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-red-400">{stats.noWebsite}</div>
                <div className="text-[10px] text-gray-500">No Website</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-orange-400">{stats.hasFax}</div>
                <div className="text-[10px] text-gray-500">Has Fax 📠</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-400">{stats.withContact}</div>
                <div className="text-[10px] text-gray-500">Has Contact</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-400">{stats.processed}/{stats.total}</div>
                <div className="text-[10px] text-gray-500">Analyzed</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select value={filterGap} onChange={e => setFilterGap(e.target.value)} className="input-field py-1.5 text-xs">
                <option value="all">All ({results.length})</option>
                <option value="no-website">No Website ({stats.noWebsite})</option>
                <option value="has-fax">Has Fax ({stats.hasFax})</option>
                <option value="stone-age">Stone Age ({stats.stoneAge})</option>
                <option value="paper-heavy">Paper Heavy ({stats.paperHeavy})</option>
                <option value="has-contact">Has Contact ({stats.withContact})</option>
              </select>

              {!processing && stats.processed < stats.total && (
                <button onClick={analyzeAll} className="btn-primary flex items-center gap-2 text-sm animate-pulse">
                  <Zap className="w-4 h-4" /> Analyze All
                </button>
              )}
              {processing && (
                <span className="text-sm text-purple-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                </span>
              )}
              {stats.processed === stats.total && stats.total > 0 && (
                <span className="text-sm text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Done!
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((r, idx) => {
            const realIdx = results.indexOf(r)
            const isExpanded = expandedIdx === realIdx
            return (
              <div key={realIdx} className={`card transition-all ${!r.website ? 'border-red-500/20' : r.hasFax ? 'border-orange-500/20' : ''}`}>
                <div className="p-4 cursor-pointer hover:bg-white/[0.02]" onClick={() => setExpandedIdx(isExpanded ? null : realIdx)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-semibold text-white truncate">{r.name}</h3>
                        {r.processing && <Loader2 className="w-3 h-3 animate-spin text-purple-400" />}
                        {r.saved && <CheckCircle className="w-3 h-3 text-green-400" />}
                        {r.duplicate && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">Duplicate</span>}
                        {!r.website && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">No Website</span>}
                        {r.hasFax && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">📠 Uses Fax</span>}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                        {r.website && (
                          <a href={r.website} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="hover:text-purple-400 truncate max-w-[200px]">
                            <Globe className="w-3 h-3 inline" /> {r.website.replace(/https?:\/\//, '')}
                          </a>
                        )}
                        {r.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {r.phone}
                            <a href={`https://wa.me/${r.phone.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(`Hi ${r.name.split(' ')[0]}, I help businesses like yours go digital. Would you be interested in a free consultation?`)}`}
                              target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-green-400 hover:text-green-300 ml-1">
                              <svg className="w-3 h-3 inline" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </a>
                          </span>
                        )}
                        {(r.scrapedEmails && r.scrapedEmails.length > 0) && (
                          <span className="text-green-400"><Mail className="w-3 h-3 inline" /> {r.scrapedEmails[0]}</span>
                        )}
                        {r.address && <span><MapPin className="w-3 h-3 inline" /> {r.address}</span>}
                      </div>
                    </div>

                    {/* Digital Score */}
                    {r.gap && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] px-2 py-1 rounded-full border ${gapColor(r.gap.gapLevel)}`}>
                          {gapLabel(r.gap.gapLevel)}
                        </span>
                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                          r.gap.digitalScore <= 20 ? 'border-red-500/50 text-red-400' :
                          r.gap.digitalScore <= 40 ? 'border-orange-500/50 text-orange-400' :
                          r.gap.digitalScore <= 60 ? 'border-yellow-500/50 text-yellow-400' :
                          'border-green-500/50 text-green-400'
                        }`}>{r.gap.digitalScore}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded: Digital gaps + services to pitch */}
                {isExpanded && r.gap && (
                  <div className="px-4 pb-4 border-t border-[var(--border)]">
                    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Digital Gaps Found</h4>
                        <div className="space-y-1.5">
                          {r.gap.gaps.map((g, i) => (
                            <div key={i} className="flex items-start gap-2 p-2 rounded bg-red-500/5 border border-red-500/10">
                              <XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                              <span className="text-xs text-gray-300">{g}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Services to Pitch</h4>
                        <div className="space-y-1.5">
                          {r.gap.services.map((s, i) => (
                            <div key={i} className="flex items-start gap-2 p-2 rounded bg-green-500/5 border border-green-500/10">
                              <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                              <span className="text-xs text-gray-300">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
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
          <span className="text-6xl mb-4 block">📠</span>
          <h3 className="text-xl font-semibold text-gray-400 mb-2">Find Paper-Based Businesses</h3>
          <p className="text-sm text-gray-600 max-w-lg mx-auto mb-6">
            Select an industry known for running on paper (law firms, clinics, mechanics, etc.),
            add cities, and scan. We&apos;ll find businesses without websites, with fax numbers,
            and tell you exactly what digital services to pitch each one.
          </p>
          <div className="text-xs text-gray-600 space-y-1">
            <p>📠 Finds businesses that still use fax machines</p>
            <p>🚫 Identifies businesses with NO website</p>
            <p>📊 Scores their digital maturity (0-100)</p>
            <p>🎯 Tells you exactly what service to sell them</p>
            <p>📧 Scrapes emails + phone numbers for outreach</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
