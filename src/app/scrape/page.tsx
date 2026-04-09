'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Search, Globe, Mail, Loader2, XCircle, Zap, MapPin, Map, ExternalLink, Phone, CheckCircle, AlertTriangle } from 'lucide-react'

interface Place {
  name: string
  website: string
  phone: string
  address: string
  category: string
  lat: number
  lng: number
  // After processing
  emails?: string[]
  score?: number | null
  saved?: boolean
  duplicate?: boolean
  processing?: boolean
  processed?: boolean
}

export default function ScrapePage() {
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState<Place[]>([])
  const [searching, setSearching] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const [showMap, setShowMap] = useState(true)
  const [mapQuery, setMapQuery] = useState('')
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationName, setLocationName] = useState('')
  const [stats, setStats] = useState({ total: 0, withSite: 0, withEmail: 0, processed: 0 })

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      )
    }
  }, [])

  // Search for businesses
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim()) return

    setSearching(true)
    setPlaces([])
    setProgress('Finding businesses...')
    setMapQuery(query)

    try {
      const res = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'find',
          query,
          lat: userLocation?.lat,
          lng: userLocation?.lng,
        }),
      })
      const data = await res.json()

      if (data.places?.length > 0) {
        setPlaces(data.places.map((p: Place) => ({ ...p, processing: false, processed: false })))
        setStats({
          total: data.places.length,
          withSite: data.places.filter((p: Place) => p.website).length,
          withEmail: 0,
          processed: 0,
        })
        if (data.location) {
          setMapCenter(data.location)
          setLocationName(data.location.display?.split(',').slice(0, 2).join(',') || '')
        }
        setProgress(`Found ${data.places.length} businesses (${data.places.filter((p: Place) => p.website).length} with websites). Click "Scrape All" to process.`)
      } else {
        setProgress('No businesses found. Try a different search like "restaurants london" or "salons dubai".')
      }
    } catch (err) {
      setProgress('Error searching. Try again.')
    }
    setSearching(false)
  }

  // Auto-process all businesses
  const processAll = async () => {
    setProcessing(true)
    const withWebsite = places.filter(p => p.website)
    let emailCount = 0
    let dupeCount = 0

    for (let i = 0; i < places.length; i++) {
      const place = places[i]

      setPlaces(prev => prev.map((p, idx) => idx === i ? { ...p, processing: true } : p))
      setProgress(`Processing ${i + 1}/${places.length}: ${place.name}...`)

      if (!place.website) {
        // No website — just save as lead
        try {
          await fetch('/api/places', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'process', place, query }),
          })
          setPlaces(prev => prev.map((p, idx) =>
            idx === i ? { ...p, processing: false, processed: true, saved: true, emails: [], score: null } : p
          ))
        } catch {
          setPlaces(prev => prev.map((p, idx) => idx === i ? { ...p, processing: false, processed: true } : p))
        }
      } else {
        // Has website — scrape + audit
        try {
          const res = await fetch('/api/places', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'process', place, query }),
          })
          const data = await res.json()
          if (data.emails?.length > 0) emailCount++
          if (data.duplicate) dupeCount++

          setPlaces(prev => prev.map((p, idx) =>
            idx === i ? {
              ...p,
              processing: false,
              processed: true,
              saved: data.saved || false,
              duplicate: data.duplicate || false,
              emails: data.emails || [],
              score: data.score ?? null,
            } : p
          ))
        } catch {
          setPlaces(prev => prev.map((p, idx) => idx === i ? { ...p, processing: false, processed: true } : p))
        }
      }

      setStats(prev => ({ ...prev, processed: i + 1, withEmail: emailCount }))
    }

    const dupeText = dupeCount > 0 ? ` (${dupeCount} duplicates skipped)` : ''
    setProgress(`Done! ${places.length} leads saved, ${emailCount} emails found.${dupeText} Check "All Leads" page.`)
    setProcessing(false)
  }

  const quickSearch = (type: string) => {
    setQuery(type)
    setMapQuery(type)
  }

  const getMapSrc = () => {
    if (mapCenter) {
      const q = mapQuery || 'businesses'
      return `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d15000!2d${mapCenter.lng}!3d${mapCenter.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2s!4v1`
    }
    if (mapQuery) {
      return `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed&z=14`
    }
    if (userLocation) {
      return `https://www.google.com/maps?q=businesses&ll=${userLocation.lat},${userLocation.lng}&output=embed&z=14`
    }
    return `https://www.google.com/maps?q=businesses&output=embed&z=12`
  }

  return (
    <DashboardLayout>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Find Leads</h1>
          <p className="text-gray-500 mt-1">
            Search → Find businesses → Auto scrape emails → Auto audit websites
          </p>
        </div>
        <button onClick={() => setShowMap(!showMap)}
          className={`btn-secondary flex items-center gap-2 text-sm ${showMap ? 'border-purple-500/30 text-purple-400' : ''}`}>
          <Map className="w-4 h-4" /> {showMap ? 'Hide Map' : 'Show Map'}
        </button>
      </div>

      {/* Search Bar */}
      <div className="card p-4 mb-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder='Type "restaurants karachi" or "salons dubai" or "dentists london"'
              className="input-field w-full pl-10 py-2.5 text-sm" disabled={searching || processing} />
          </div>
          <button type="submit" disabled={searching || processing}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 px-5">
            {searching ? <><Loader2 className="w-4 h-4 animate-spin" /> Finding...</> : <><Search className="w-4 h-4" /> Find Businesses</>}
          </button>
        </form>

        {/* Quick Search Tags */}
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            'restaurants karachi', 'salons dubai', 'dentists london',
            'gyms lahore', 'hotels islamabad', 'clinics rawalpindi',
            'shops new york', 'agencies san francisco',
          ].map(example => (
            <button key={example} onClick={() => quickSearch(example)}
              className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all">
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Results */}
        <div className={showMap ? 'w-full lg:w-[58%] min-w-0' : 'w-full'}>

          {/* Stats + Scrape All Button */}
          {places.length > 0 && (
            <div className="card p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{stats.total}</div>
                    <div className="text-[10px] text-gray-500 uppercase">Found</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{stats.withSite}</div>
                    <div className="text-[10px] text-gray-500 uppercase">With Website</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{stats.withEmail}</div>
                    <div className="text-[10px] text-gray-500 uppercase">Emails Found</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{stats.processed}/{stats.total}</div>
                    <div className="text-[10px] text-gray-500 uppercase">Processed</div>
                  </div>
                </div>

                {!processing && stats.processed < stats.total && (
                  <button onClick={processAll} className="btn-primary flex items-center gap-2 text-sm animate-pulse">
                    <Zap className="w-4 h-4" /> Scrape All ({stats.total})
                  </button>
                )}
                {processing && (
                  <div className="flex items-center gap-2 text-sm text-purple-400">
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </div>
                )}
                {stats.processed === stats.total && stats.total > 0 && (
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <CheckCircle className="w-4 h-4" /> All Done!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress */}
          {progress && (
            <div className="card p-3 mb-3 flex items-center gap-2">
              {(searching || processing) && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />}
              <span className="text-xs text-gray-300">{progress}</span>
            </div>
          )}

          {/* Location badge */}
          {locationName && (
            <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
              <MapPin className="w-3 h-3 text-purple-400" />
              Showing businesses in: <span className="text-gray-300">{locationName}</span>
            </div>
          )}

          {/* Empty State */}
          {places.length === 0 && !searching && (
            <div className="card p-8 text-center">
              <Globe className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Search for businesses</h3>
              <p className="text-sm text-gray-600 mb-2">
                Type something like &quot;restaurants karachi&quot; and we&apos;ll automatically:
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>1. Find all businesses in that area</p>
                <p>2. Scrape their emails from websites</p>
                <p>3. Audit their website quality (score 0-100)</p>
                <p>4. Save everything to your leads database</p>
              </div>
            </div>
          )}

          {/* Business Results */}
          {places.length > 0 && (
            <div className="space-y-2 max-h-[calc(100vh-340px)] overflow-y-auto pr-1">
              {places.map((place, idx) => (
                <div key={idx} className={`card p-3.5 transition-all ${place.processing ? 'border-purple-500/30' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-white truncate">{place.name}</h3>
                        {place.saved && (
                          <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                        )}
                        {place.duplicate && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Duplicate</span>
                        )}
                      </div>

                      {place.address && (
                        <p className="text-[11px] text-gray-500 truncate mb-1">
                          <MapPin className="w-3 h-3 inline text-gray-600" /> {place.address}
                        </p>
                      )}

                      {place.website ? (
                        <a href={place.website} target="_blank" rel="noopener"
                          className="text-xs text-purple-400 hover:text-purple-300 truncate block">
                          <Globe className="w-3 h-3 inline" /> {place.website.replace(/https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-600">
                          <AlertTriangle className="w-3 h-3 inline" /> No website listed
                        </span>
                      )}

                      {place.phone && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          <Phone className="w-3 h-3 inline" /> {place.phone}
                        </p>
                      )}

                      {/* Email result */}
                      {place.processed && (
                        <div className="mt-1.5">
                          {place.emails && place.emails.length > 0 ? (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {place.emails.join(', ')}
                            </span>
                          ) : place.website ? (
                            <span className="text-xs text-gray-600 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> No email found
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* Score / Status */}
                    <div className="flex-shrink-0">
                      {place.processing ? (
                        <div className="w-11 h-11 rounded-full border-2 border-purple-500/30 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                        </div>
                      ) : place.score != null ? (
                        <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                          place.score >= 70 ? 'border-green-500/50 text-green-400' :
                          place.score >= 40 ? 'border-yellow-500/50 text-yellow-400' :
                          'border-red-500/50 text-red-400'
                        }`}>{place.score}</div>
                      ) : place.processed ? (
                        <div className="w-11 h-11 rounded-full border-2 border-gray-700 flex items-center justify-center text-[10px] text-gray-500">
                          N/A
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Google Maps */}
        {showMap && (
          <div className="w-full lg:w-[42%] flex-shrink-0 max-h-[50vh] lg:max-h-none">
            <div className="sticky top-8">
              <div className="card overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
                <div className="p-3 border-b border-[var(--border)]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-white">Live Map</span>
                    </div>
                    <a href={`https://www.google.com/maps/search/${encodeURIComponent(mapQuery || query || 'businesses near me')}`}
                      target="_blank" rel="noopener" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                      Open full <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {['Restaurants', 'Salons', 'Dentists', 'Gyms', 'Hotels', 'Clinics', 'Shops', 'Banks'].map(type => (
                      <button key={type} onClick={() => {
                        const q = `${type.toLowerCase()} ${query.split(' ').slice(1).join(' ') || 'near me'}`
                        setQuery(q)
                        setMapQuery(q)
                        // Auto-trigger search
                        setTimeout(() => {
                          const form = document.querySelector('form')
                          if (form) form.requestSubmit()
                        }, 100)
                      }}
                        className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all">
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <iframe
                  src={getMapSrc()}
                  className="w-full border-0"
                  style={{ height: 'calc(100% - 80px)' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
