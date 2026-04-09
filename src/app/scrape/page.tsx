'use client'

import { useState, useRef } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Search, Globe, Mail, Loader2, XCircle, Zap, Plus, Link, Trash2, ExternalLink } from 'lucide-react'

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
  const [urlInput, setUrlInput] = useState('')
  const [urls, setUrls] = useState<string[]>([])
  const [results, setResults] = useState<ScrapeResult[]>([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const [googleResults, setGoogleResults] = useState<Array<{ name: string; website: string }>>([])
  const [showGoogleStep, setShowGoogleStep] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Client-side Google search: Open Google, user copies results
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

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

    // Server search failed - use client-side approach
    setProgress('')
    setShowGoogleStep(true)
    setProcessing(false)
  }

  // Extract websites from pasted Google results text
  const extractFromGoogleText = (text: string) => {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g
    const found = text.match(urlRegex) || []

    // Also try to find domain-like strings
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
      'reddit.com', 'pinterest.com', 'tiktok.com', 'tripadvisor.com', 'yelp.com']
    return blocked.some(d => url.toLowerCase().includes(d))
  }

  const handleGooglePaste = async () => {
    const text = urlInput
    const extracted = extractFromGoogleText(text)

    if (extracted.length === 0) {
      setProgress('No websites found. Try pasting more text or individual URLs.')
      return
    }

    const businesses = extracted.map(url => {
      let name = url.replace(/https?:\/\//, '').replace(/^www\./, '').split('/')[0]
      const parts = name.split('.')
      name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
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
      const parts = name.split('.')
      name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
      return { name, website: url, phone: '', address: '', category: 'business' }
    })
    await processBusinesses(businesses, 'manual')
  }

  const processBusinesses = async (businesses: any[], query: string) => {
    setProcessing(true)
    const initial: ScrapeResult[] = businesses.map(r => ({
      name: r.name,
      website: r.website,
      emails: [],
      score: null,
      saved: false,
      processing: false,
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
          idx === i ? {
            ...r,
            emails: data.emails || [],
            score: data.score ?? null,
            saved: data.saved || false,
            processing: false,
          } : r
        ))
      } catch {
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, processing: false } : r
        ))
      }
    }

    setProgress(`Done! Processed ${initial.length} businesses.`)
    setProcessing(false)
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Find Leads</h1>
        <p className="text-gray-500 mt-1">Search for businesses, scrape emails, and audit websites</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setMode('search'); setShowGoogleStep(false) }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'search'
              ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Search className="w-4 h-4 inline mr-2" />Auto Search
        </button>
        <button
          onClick={() => { setMode('urls'); setShowGoogleStep(false) }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'urls'
              ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Link className="w-4 h-4 inline mr-2" />Paste URLs
        </button>
      </div>

      {/* Auto Search Mode */}
      {mode === 'search' && !showGoogleStep && (
        <div className="card p-6 mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder='Try "restaurants karachi" or "salons dubai"'
                className="input-field w-full pl-12" disabled={processing} />
            </div>
            <button type="submit" disabled={processing} className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</> : <><Zap className="w-4 h-4" /> Find Leads</>}
            </button>
          </form>
        </div>
      )}

      {/* Google Copy-Paste Step */}
      {mode === 'search' && showGoogleStep && (
        <div className="card p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold text-sm">1</div>
            <h3 className="text-white font-semibold">Open Google and copy results</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Click below to search Google for <strong className="text-purple-400">&quot;{query}&quot;</strong>, then select all results (Ctrl+A) and paste them below.
          </p>
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(query + ' website')}&num=20`}
            target="_blank"
            rel="noopener"
            className="btn-secondary inline-flex items-center gap-2 mb-6"
          >
            <ExternalLink className="w-4 h-4" /> Open Google Search
          </a>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold text-sm">2</div>
            <h3 className="text-white font-semibold">Paste the results here</h3>
          </div>
          <textarea
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="Select all text from Google results page (Ctrl+A, Ctrl+C) and paste here..."
            className="input-field w-full min-h-[150px] resize-y mb-4"
          />
          <button onClick={handleGooglePaste} disabled={!urlInput.trim() || processing}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            <Zap className="w-4 h-4" /> Extract & Process Websites
          </button>
          <button onClick={() => setShowGoogleStep(false)} className="btn-secondary ml-3">
            Cancel
          </button>
        </div>
      )}

      {/* URL Paste Mode */}
      {mode === 'urls' && (
        <div className="card p-6 mb-8">
          <p className="text-sm text-gray-400 mb-4">
            Paste website URLs — one per line or comma-separated. We&apos;ll scrape emails and audit each site.
          </p>
          <textarea
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addUrls() } }}
            placeholder={"example.com\nhttps://another-site.com\nbusiness-website.pk"}
            className="input-field w-full min-h-[100px] resize-y mb-4"
            disabled={processing}
          />
          <div className="flex gap-3 mb-4">
            <button onClick={addUrls} className="btn-secondary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add URLs
            </button>
            {urls.length > 0 && (
              <button onClick={handleProcessUrls} disabled={processing} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
                {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><Zap className="w-4 h-4" /> Process {urls.length} URLs</>}
              </button>
            )}
          </div>
          {urls.length > 0 && (
            <div className="space-y-2">
              {urls.map((url, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] border border-[var(--border)]">
                  <Globe className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-sm text-gray-300 flex-1 truncate">{url}</span>
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
        <div className="card p-4 mb-6 flex items-center gap-3">
          {processing && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
          <span className="text-sm text-gray-300">{progress}</span>
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !processing && !showGoogleStep && (
        <div className="card p-8 text-center">
          <Globe className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">
            {mode === 'search' ? 'Search for businesses to generate leads' : 'Add website URLs to process'}
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            {mode === 'search'
              ? 'We\'ll auto-search or guide you to copy results from Google'
              : 'Paste URLs from Google Maps, directories, or anywhere'}
          </p>
          {mode === 'search' && (
            <div className="flex flex-wrap gap-2 justify-center">
              {['restaurants karachi', 'salons dubai', 'dentists london', 'gyms lahore', 'web agencies pakistan'].map(example => (
                <button key={example} onClick={() => setQuery(example)}
                  className="text-sm px-4 py-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all">
                  {example}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, idx) => (
            <div key={idx} className="card card-hover p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-semibold truncate">{result.name}</h3>
                    {result.saved && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Saved</span>
                    )}
                  </div>
                  <a href={result.website} target="_blank" rel="noopener" className="text-sm text-gray-400 hover:text-purple-400 truncate block">
                    {result.website}
                  </a>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2 text-sm">
                      {result.processing ? (
                        <><Loader2 className="w-3 h-3 animate-spin text-blue-400" /><span className="text-blue-400">Scraping &amp; auditing...</span></>
                      ) : result.emails.length > 0 ? (
                        <><Mail className="w-3 h-3 text-green-400" /><span className="text-green-400">{result.emails.join(', ')}</span></>
                      ) : (
                        <><XCircle className="w-3 h-3 text-gray-600" /><span className="text-gray-600">No email found</span></>
                      )}
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  {result.processing ? (
                    <div className="w-16 h-16 rounded-full border-2 border-purple-500/30 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                    </div>
                  ) : result.score !== null ? (
                    <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center text-lg font-bold ${
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
    </DashboardLayout>
  )
}
