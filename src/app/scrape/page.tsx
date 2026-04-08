'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Search, Globe, Mail, Loader2, CheckCircle, XCircle, Zap } from 'lucide-react'

interface ScrapeResult {
  name: string
  website: string
  phone: string
  address: string
  category: string
  emails: string[]
  score: number | null
  saved: boolean
  auditing: boolean
  scraping_email: boolean
}

export default function ScrapePage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ScrapeResult[]>([])
  const [searching, setSearching] = useState(false)
  const [progress, setProgress] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setSearching(true)
    setResults([])
    setProgress('Searching for businesses...')

    try {
      // Step 1: Search for businesses
      const searchRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, action: 'search' }),
      })
      const searchData = await searchRes.json()

      if (!searchData.results?.length) {
        setProgress('No results found. Try a different query.')
        setSearching(false)
        return
      }

      const initial: ScrapeResult[] = searchData.results.map((r: any) => ({
        ...r,
        emails: [],
        score: null,
        saved: false,
        auditing: false,
        scraping_email: false,
      }))
      setResults(initial)
      setProgress(`Found ${initial.length} businesses. Scraping emails & auditing...`)

      // Step 2: Process each result
      for (let i = 0; i < initial.length; i++) {
        const item = initial[i]
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, scraping_email: true, auditing: true } : r
        ))

        try {
          const processRes = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'process',
              business: item,
              query,
            }),
          })
          const processData = await processRes.json()

          setResults(prev => prev.map((r, idx) =>
            idx === i ? {
              ...r,
              emails: processData.emails || [],
              score: processData.score ?? null,
              saved: processData.saved || false,
              scraping_email: false,
              auditing: false,
            } : r
          ))
        } catch {
          setResults(prev => prev.map((r, idx) =>
            idx === i ? { ...r, scraping_email: false, auditing: false } : r
          ))
        }

        setProgress(`Processing ${i + 1}/${initial.length}...`)
      }

      setProgress('Done! All businesses processed.')
    } catch (err) {
      setProgress('Error occurred during search.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Find Leads</h1>
        <p className="text-gray-500 mt-1">Search for businesses, scrape emails, and audit websites</p>
      </div>

      {/* Search Form */}
      <div className="card p-6 mb-8">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder='Try "restaurants karachi" or "salons dubai" or "dentists london"'
              className="input-field w-full pl-12"
              disabled={searching}
            />
          </div>
          <button type="submit" disabled={searching} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {searching ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</>
            ) : (
              <><Zap className="w-4 h-4" /> Find Leads</>
            )}
          </button>
        </form>
        {progress && (
          <p className="text-sm text-gray-400 mt-3 flex items-center gap-2">
            {searching && <Loader2 className="w-3 h-3 animate-spin" />}
            {progress}
          </p>
        )}
      </div>

      {/* Search Examples */}
      {results.length === 0 && !searching && (
        <div className="card p-8 text-center">
          <Globe className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">Search for businesses to generate leads</h3>
          <p className="text-sm text-gray-600 mb-6">Enter a business type and location to find potential clients</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {['restaurants karachi', 'salons dubai', 'dentists london', 'gyms lahore', 'hotels islamabad', 'startups san francisco'].map(example => (
              <button
                key={example}
                onClick={() => setQuery(example)}
                className="text-sm px-4 py-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all"
              >
                {example}
              </button>
            ))}
          </div>
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
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                        Saved
                      </span>
                    )}
                  </div>
                  <a href={result.website} target="_blank" rel="noopener" className="text-sm text-gray-400 hover:text-purple-400 truncate block">
                    {result.website}
                  </a>

                  <div className="flex items-center gap-4 mt-3">
                    {/* Email status */}
                    <div className="flex items-center gap-2 text-sm">
                      {result.scraping_email ? (
                        <><Loader2 className="w-3 h-3 animate-spin text-blue-400" /><span className="text-blue-400">Finding emails...</span></>
                      ) : result.emails.length > 0 ? (
                        <><Mail className="w-3 h-3 text-green-400" /><span className="text-green-400">{result.emails.join(', ')}</span></>
                      ) : (
                        <><XCircle className="w-3 h-3 text-gray-600" /><span className="text-gray-600">No email found</span></>
                      )}
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="ml-4 flex-shrink-0">
                  {result.auditing ? (
                    <div className="w-16 h-16 rounded-full border-2 border-purple-500/30 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                    </div>
                  ) : result.score !== null ? (
                    <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center text-lg font-bold ${
                      result.score >= 70 ? 'border-green-500/50 text-green-400' :
                      result.score >= 40 ? 'border-yellow-500/50 text-yellow-400' :
                      'border-red-500/50 text-red-400'
                    }`}>
                      {result.score}
                    </div>
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
