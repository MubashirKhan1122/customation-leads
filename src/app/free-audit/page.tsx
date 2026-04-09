'use client'

import { useState } from 'react'
import { Globe, Loader2, CheckCircle, XCircle, AlertTriangle, Zap, Shield, Smartphone, Type, FileText, Code, Clock, Image } from 'lucide-react'

interface AuditData {
  score: number
  load_time: number
  has_ssl: boolean
  has_mobile_viewport: boolean
  has_title: boolean
  has_meta_description: boolean
  has_h1: boolean
  has_og_tags: boolean
  has_analytics: boolean
  image_count: number
  content_length: number
  font_count: number
  issues: string[]
}

export default function FreeAuditPage() {
  const [url, setUrl] = useState('')
  const [email, setEmail] = useState('')
  const [auditing, setAuditing] = useState(false)
  const [result, setResult] = useState<AuditData | null>(null)
  const [captured, setCaptured] = useState(false)

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    let fullUrl = url.trim()
    if (!fullUrl.startsWith('http')) fullUrl = 'https://' + fullUrl

    setAuditing(true)
    setResult(null)

    try {
      const res = await fetch('/api/free-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fullUrl, email }),
      })
      const data = await res.json()
      if (data.audit) {
        setResult(data.audit)
        if (email) setCaptured(true)
      }
    } catch {}
    setAuditing(false)
  }

  const checks = result ? [
    { label: 'SSL Security', value: result.has_ssl, icon: Shield },
    { label: 'Mobile Friendly', value: result.has_mobile_viewport, icon: Smartphone },
    { label: 'Page Title', value: result.has_title, icon: Type },
    { label: 'Meta Description', value: result.has_meta_description, icon: FileText },
    { label: 'H1 Heading', value: result.has_h1, icon: Type },
    { label: 'Social Tags', value: result.has_og_tags, icon: Code },
    { label: 'Analytics', value: result.has_analytics, icon: Code },
  ] : []

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm mb-6">
            <Zap className="w-4 h-4" /> Free Website Audit Tool
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            How Good Is Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">Website</span>?
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
            Get a free, instant audit of your website. Check speed, SEO, mobile-friendliness, security, and more.
          </p>

          {/* Audit Form */}
          <form onSubmit={handleAudit} className="max-w-xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="text" value={url} onChange={e => setUrl(e.target.value)}
                placeholder="Enter your website URL" required
                className="flex-1 bg-[#111118] border border-[#1e1e2e] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
              <button type="submit" disabled={auditing}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium px-8 py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {auditing ? <><Loader2 className="w-4 h-4 animate-spin" /> Auditing...</> : <><Globe className="w-4 h-4" /> Audit Now</>}
              </button>
            </div>
            <div className="mt-3">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Your email (optional — to receive full report)"
                className="w-full bg-[#111118] border border-[#1e1e2e] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm" />
            </div>
          </form>

          <p className="text-xs text-gray-600 mt-3">Powered by Customation — Design & Tech Agency</p>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="max-w-4xl mx-auto px-4 pb-16">
          {/* Score */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full border-4 text-4xl font-bold ${
              result.score >= 70 ? 'border-green-500 text-green-400' :
              result.score >= 40 ? 'border-yellow-500 text-yellow-400' :
              'border-red-500 text-red-400'
            }`}>
              {result.score}
            </div>
            <p className="text-gray-400 mt-3 text-lg">
              {result.score >= 70 ? 'Good — but there\'s room for improvement' :
               result.score >= 40 ? 'Needs Work — several issues found' :
               'Critical — your website needs serious attention'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Checks */}
            <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Technical Checks</h3>
              <div className="space-y-3">
                {checks.map(check => (
                  <div key={check.label} className="flex items-center justify-between py-2 border-b border-[#1e1e2e] last:border-0">
                    <div className="flex items-center gap-2">
                      <check.icon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-300">{check.label}</span>
                    </div>
                    {check.value ?
                      <CheckCircle className="w-5 h-5 text-green-400" /> :
                      <XCircle className="w-5 h-5 text-red-400" />}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-[#1e1e2e] space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500"><Clock className="w-4 h-4 inline" /> Load Time</span>
                  <span className={result.load_time > 3 ? 'text-red-400' : 'text-green-400'}>{result.load_time?.toFixed(1)}s</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500"><Image className="w-4 h-4 inline" /> Images</span>
                  <span className="text-gray-300">{result.image_count}</span>
                </div>
              </div>
            </div>

            {/* Issues */}
            <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                Issues Found ({result.issues.length})
              </h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {result.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded bg-red-500/5 border border-red-500/10">
                    <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-gray-300">{issue}</span>
                  </div>
                ))}
                {result.issues.length === 0 && <p className="text-sm text-gray-500">No major issues found!</p>}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/20 rounded-xl p-8 text-center">
            <h3 className="text-xl font-bold mb-2">Want these issues fixed?</h3>
            <p className="text-gray-400 mb-4">We can help you improve your website score and get more customers from Google.</p>
            <a href="https://wa.me/923001234567?text=Hi%2C%20I%20just%20used%20your%20free%20audit%20tool%20and%20want%20to%20discuss%20fixing%20my%20website."
              target="_blank" rel="noopener"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-medium px-6 py-3 rounded-lg transition-all">
              Chat on WhatsApp
            </a>
          </div>

          {captured && (
            <p className="text-center text-xs text-gray-500 mt-4">
              Full report sent to {email}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
