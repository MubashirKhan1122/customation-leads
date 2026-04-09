'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Search, Globe, Mail, Loader2, XCircle, Zap, Plus, Link, Trash2, ExternalLink, MapPin, Map } from 'lucide-react'

interface ScrapeResult {
  name: string
  website: string
  emails: string[]
  score: number | null
  saved: boolean
  processing: boolean
}

export default function ScrapePage() {
  const [mode, setMode] = useState<'search' | 'urls'>('search')
  const [query, setQuery] = useState('')
  const [mapQuery, setMapQuery] = useState('')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [urls, setUrls] = useState<string[]>([])
  const [results, setResults] = useState<ScrapeResult[]>([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const [showGoogleStep, setShowGoogleStep] = useState(false)
  const [showMap, setShowMap] = useState(true)

  // Get user location on mount
  useState(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // Silently fail
      )
    }
  })

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    // Update map
    setMapQuery(query)
    setShowMap(true)
    setProcessing(true)
    setResults([])
    setProgress('Searching...')

    // Try server-side search first
    try {
      const searchRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, action: 'search' }),
      })
      const searchData = await searchRes.json()

      if (searchData.results?.length > 0) {
        await processBusinesses(searchData.results, query)
        setProcessing(false)
        return
      }
    } catch {}

    // Server search failed - show Google Maps + paste flow
    setProgress('')
    setShowGoogleStep(true)
    setProcessing(false)
  }

  const extractFromGoogleText = (text: string) => {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g
    const found = text.match(urlRegex) || []
    const domainRegex = /(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]*\.)+[a-zA-Z]{2,}/g
    const domains = text.match(domainRegex) || []

    const allUrls = new Set<string>()
    found.forEach(u => {
      try {
        const origin = new URL(u).origin
        if (!isBlocked(origin)) allUrls.add(origin)
      } catch {}
    })
    domains.forEach(d => {
      const url = d.startsWith('http') ? d : `https://${d}`
      try {
        const origin = new URL(url).origin
        if (!isBlocked(origin)) allUrls.add(origin)
      } catch {}
    })
    return Array.from(allUrls)
  }

  const isBlocked = (url: string) => {
    const blocked = ['google.com', 'bing.com', 'yahoo.com', 'facebook.com', 'instagram.com',
      'twitter.com', 'youtube.com', 'linkedin.com', 'wikipedia.org', 'amazon.com',
      'reddit.com', 'pinterest.com', 'tiktok.com', 'tripadvisor.com', 'yelp.com', 'gstatic.com']
    return blocked.some(d => url.toLowerCase().includes(d))
  }

  const handleGooglePaste = async () => {
    const extracted = extractFromGoogleText(urlInput)
    if (extracted.length === 0) {
      setProgress('No websites found. Try pasting more text or individual URLs.')
      return
    }
    const businesses = extracted.map(url => {
      let name = url.replace(/https?:\/\//, '').replace(/^www\./, '').split('/')[0]
      name = name.split('.')[0].charAt(0).toUpperCase() + name.split('.')[0].slice(1)
      return { name, website: url, phone: '', address: '', category: query.split(' ')[0] || 'business' }
    })
    setShowGoogleStep(false)
    setUrlInput('')
    await processBusinesses(businesses, query || 'manual')
  }

  const addUrls = () => {
    const trimmed = urlInput.trim()
    if (!trimmed) return
    const newUrls = trimmed.split(/[\n,]+/).map(u => {
      let url = u.trim()
      if (url && !url.startsWith('http')) url = 'https://' + url
      return url
    }).filter(u => u && u.includes('.'))
    setUrls(prev => [...prev, ...newUrls.filter(u => !prev.includes(u))])
    setUrlInput('')
  }

  const handleProcessUrls = async () => {
    if (urls.length === 0) return
    const businesses = urls.map(url => {
      let name = url.replace(/https?:\/\//, '').replace(/^www\./, '').split('/')[0]
      name = name.split('.')[0].charAt(0).toUpperCase() + name.split('.')[0].slice(1)
      return { name, website: url, phone: '', address: '', category: 'business' }
    })
    await processBusinesses(businesses, 'manual')
  }

  const processBusinesses = async (businesses: any[], query: string) => {
    setProcessing(true)
    const initial: ScrapeResult[] = businesses.map(r => ({
      name: r.name, website: r.website, emails: [], score: null, saved: false, processing: false,
    }))
    setResults(initial)

    for (let i = 0; i < initial.length; i++) {
      setResults(prev => prev.map((r, idx) => idx === i ? { ...r, processing: true } : r))
      setProgress(`Processing ${i + 1}/${initial.length}: ${initial[i].name}...`)

      try {
        const res = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'process', business: businesses[i], query }),
        })
        const data = await res.json()
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, emails: data.emails || [], score: data.score ?? null, saved: data.saved || false, processing: false } : r
        ))
      } catch {
        setResults(prev => prev.map((r, idx) => idx === i ? { ...r, processing: false } : r))
      }
    }
    setProgress(`Done! Processed ${initial.length} businesses.`)
    setProcessing(false)
  }

  const getMapSrc = () => {
    if (mapQuery) {
      return `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed&z=14`
    }
    if (userLocation) {
      return `https://www.google.com/maps?q=businesses&ll=${userLocation.lat},${userLocation.lng}&output=embed&z=14`
    }
    return `https://www.google.com/maps?q=businesses+near+me&output=embed&z=12`
  }
  const mapSrc = getMapSrc()

  const searchNearMe = (type: string) => {
    const q = userLocation
      ? `${type} near ${userLocation.lat},${userLocation.lng}`
      : `${type} near me`
    setQuery(type)
    setMapQuery(q)
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Find Leads</h1>
          <p className="text-gray-500 mt-1">Search for businesses, scrape emails, and audit websites</p>
        </div>
        <button
          onClick={() => setShowMap(!showMap)}
          className={`btn-secondary flex items-center gap-2 text-sm ${showMap ? 'border-purple-500/30 text-purple-400' : ''}`}
        >
          <Map className="w-4 h-4" /> {showMap ? 'Hide Map' : 'Show Map'}
        </button>
      </div>

      {/* Main Layout: Left content + Right map */}
      <div className={`flex gap-6 ${showMap ? '' : ''}`}>
        {/* Left Panel: Search + Results */}
        <div className={`${showMap ? 'w-[55%]' : 'w-full'} min-w-0 flex-shrink-0`}>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => { setMode('search'); setShowGoogleStep(false) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'search' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}>
              <Search className="w-3.5 h-3.5 inline mr-1.5" />Auto Search
            </button>
            <button onClick={() => { setMode('urls'); setShowGoogleStep(false) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'urls' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}>
              <Link className="w-3.5 h-3.5 inline mr-1.5" />Paste URLs
            </button>
          </div>

          {/* Auto Search */}
          {mode === 'search' && !showGoogleStep && (
            <div className="card p-4 mb-4">
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                    placeholder='Try "restaurants karachi" or "salons dubai"'
                    className="input-field w-full pl-10 py-2 text-sm" disabled={processing} />
                </div>
                <button type="submit" disabled={processing} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 px-4">
                  {processing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching...</> : <><Zap className="w-3.5 h-3.5" /> Find</>}
                </button>
              </form>
              {showMap && (
                <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Google Maps updates as you search. Browse the map to find businesses, then copy their websites.
                </p>
              )}
            </div>
          )}

          {/* Google Paste Step */}
          {mode === 'search' && showGoogleStep && (
            <div className="card p-5 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold text-xs">1</div>
                <h3 className="text-white font-semibold text-sm">Browse the map or open Google</h3>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Find businesses for <strong className="text-purple-400">&quot;{query}&quot;</strong> on the map (right side), or search Google directly:
              </p>
              <a href={`https://www.google.com/search?q=${encodeURIComponent(query + ' website')}&num=20`}
                target="_blank" rel="noopener" className="btn-secondary inline-flex items-center gap-2 text-xs mb-5">
                <ExternalLink className="w-3.5 h-3.5" /> Open Google Search
              </a>

              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold text-xs">2</div>
                <h3 className="text-white font-semibold text-sm">Paste results or URLs here</h3>
              </div>
              <textarea value={urlInput} onChange={e => setUrlInput(e.target.value)}
                placeholder="Paste Google results text, or business website URLs (one per line)..."
                className="input-field w-full min-h-[100px] resize-y mb-3 text-sm" />
              <div className="flex gap-2">
                <button onClick={handleGooglePaste} disabled={!urlInput.trim() || processing}
                  className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
                  <Zap className="w-3.5 h-3.5" /> Extract &amp; Process
                </button>
                <button onClick={() => setShowGoogleStep(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* URL Paste Mode */}
          {mode === 'urls' && (
            <div className="card p-4 mb-4">
              <p className="text-xs text-gray-400 mb-3">Paste website URLs — one per line or comma-separated.</p>
              <textarea value={urlInput} onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addUrls() } }}
                placeholder={"example.com\nhttps://another-site.com\nbusiness-website.pk"}
                className="input-field w-full min-h-[80px] resize-y mb-3 text-sm" disabled={processing} />
              <div className="flex gap-3 mb-3">
                <button onClick={addUrls} className="btn-secondary flex items-center gap-2 text-xs"><Plus className="w-3.5 h-3.5" /> Add</button>
                {urls.length > 0 && (
                  <button onClick={handleProcessUrls} disabled={processing} className="btn-primary flex items-center gap-2 text-xs disabled:opacity-50">
                    {processing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</> : <><Zap className="w-3.5 h-3.5" /> Process {urls.length} URLs</>}
                  </button>
                )}
              </div>
              {urls.length > 0 && (
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {urls.map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-1.5 rounded bg-white/[0.02] border border-[var(--border)]">
                      <Globe className="w-3 h-3 text-gray-500 flex-shrink-0" />
                      <span className="text-xs text-gray-300 flex-1 truncate">{url}</span>
                      <button onClick={() => setUrls(prev => prev.filter((_, i) => i !== idx))} className="text-gray-500 hover:text-red-400">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {progress && (
            <div className="card p-3 mb-4 flex items-center gap-2">
              {processing && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />}
              <span className="text-xs text-gray-300">{progress}</span>
            </div>
          )}

          {/* Empty State */}
          {results.length === 0 && !processing && !showGoogleStep && (
            <div className="card p-6 text-center">
              <Globe className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-400 mb-1.5">
                {mode === 'search' ? 'Search for businesses to generate leads' : 'Add website URLs to process'}
              </h3>
              <p className="text-xs text-gray-600 mb-4">
                {mode === 'search'
                  ? 'Search or browse the map to find businesses'
                  : 'Paste URLs from Google Maps, directories, or anywhere'}
              </p>
              {mode === 'search' && (
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {['restaurants karachi', 'salons dubai', 'dentists london', 'gyms lahore', 'web agencies pakistan'].map(example => (
                    <button key={example} onClick={() => { setQuery(example); setMapQuery(example) }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all">
                      {example}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {results.map((result, idx) => (
                <div key={idx} className="card card-hover p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold text-sm truncate">{result.name}</h3>
                        {result.saved && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Saved</span>
                        )}
                      </div>
                      <a href={result.website} target="_blank" rel="noopener" className="text-xs text-gray-400 hover:text-purple-400 truncate block">
                        {result.website}
                      </a>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5 text-xs">
                          {result.processing ? (
                            <><Loader2 className="w-3 h-3 animate-spin text-blue-400" /><span className="text-blue-400">Scraping...</span></>
                          ) : result.emails.length > 0 ? (
                            <><Mail className="w-3 h-3 text-green-400" /><span className="text-green-400">{result.emails.join(', ')}</span></>
                          ) : (
                            <><XCircle className="w-3 h-3 text-gray-600" /><span className="text-gray-600">No email</span></>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {result.processing ? (
                        <div className="w-12 h-12 rounded-full border-2 border-purple-500/30 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                        </div>
                      ) : result.score !== null ? (
                        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
                          result.score >= 70 ? 'border-green-500/50 text-green-400' :
                          result.score >= 40 ? 'border-yellow-500/50 text-yellow-400' :
                          'border-red-500/50 text-red-400'
                        }`}>{result.score}</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel: Google Maps */}
        {showMap && (
          <div className="w-[45%] flex-shrink-0">
            <div className="sticky top-8">
              <div className="card overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
                {/* Map Header */}
                <div className="p-3 border-b border-[var(--border)]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-white">Google Maps</span>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent(mapQuery || 'businesses near me')}`}
                      target="_blank" rel="noopener"
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      Open full <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  {/* Near Me Quick Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {['Restaurants', 'Salons', 'Dentists', 'Gyms', 'Hotels', 'Clinics', 'Schools', 'Shops'].map(type => (
                      <button key={type} onClick={() => searchNearMe(type.toLowerCase())}
                        className="text-[10px] px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all">
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Map Embed */}
                <iframe
                  src={mapSrc}
                  className="w-full border-0"
                  style={{ height: 'calc(100% - 100px)' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                {/* Map Tips */}
                <div className="p-3 border-t border-[var(--border)] bg-[#0d0d14]">
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    <strong className="text-gray-400">Tip:</strong> Click businesses on the map to find their websites, then paste the URLs in the search panel to scrape emails &amp; audit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
