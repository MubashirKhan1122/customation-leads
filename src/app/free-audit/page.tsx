'use client'

import { useState } from 'react'
import { Globe, Loader2, CheckCircle, XCircle, AlertTriangle, Zap, Shield, Smartphone, Type, FileText, Code, Clock, Image, Monitor, ExternalLink } from 'lucide-react'

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
  const [fullUrl, setFullUrl] = useState('')
  const [email, setEmail] = useState('')
  const [auditing, setAuditing] = useState(false)
  const [result, setResult] = useState<AuditData | null>(null)
  const [captured, setCaptured] = useState(false)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    let u = url.trim()
    if (!u.startsWith('http')) u = 'https://' + u
    setFullUrl(u)

    setAuditing(true)
    setResult(null)

    try {
      const res = await fetch('/api/free-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: u, email }),
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

  const passCount = checks.filter(c => c.value).length
  const failCount = checks.filter(c => !c.value).length

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <nav className="border-b border-[#1e1e2e] bg-[#0d0d14]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">Customation</span>
            <span className="text-xs text-gray-500">Free Audit Tool</span>
          </div>
          <a href="https://wa.me/923001234567?text=Hi%2C%20I%20want%20to%20discuss%20improving%20my%20website"
            target="_blank" rel="noopener"
            className="text-sm bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Get Help
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 pt-12 pb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm mb-6">
            <Zap className="w-4 h-4" /> 100% Free - No Signup Required
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            How Good Is Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">Website</span>?
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
            Get an instant score out of 100. We check speed, SEO, mobile, security, and 15+ factors.
          </p>

          {/* Audit Form */}
          <form onSubmit={handleAudit} className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="text" value={url} onChange={e => setUrl(e.target.value)}
                placeholder="Enter website URL (e.g. yoursite.com)" required
                className="flex-1 bg-[#111118] border border-[#1e1e2e] rounded-lg px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-lg" />
              <button type="submit" disabled={auditing}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold px-8 py-3.5 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-lg shadow-lg shadow-purple-500/20">
                {auditing ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</> : <><Globe className="w-5 h-5" /> Audit Now</>}
              </button>
            </div>
            <div className="mt-3">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Your email (optional — get the full report in your inbox)"
                className="w-full bg-[#111118] border border-[#1e1e2e] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm" />
            </div>
          </form>
        </div>
      </div>

      {/* How It Works - shown before results */}
      {!result && !auditing && (
        <div className="max-w-4xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {[
              { icon: Globe, title: 'Enter Your URL', desc: 'Just paste your website address — no signup needed' },
              { icon: Zap, title: 'Instant Analysis', desc: 'We check 15+ factors: speed, SEO, mobile, security, design' },
              { icon: CheckCircle, title: 'Get Your Score', desc: 'See your score out of 100 with specific issues to fix' },
            ].map((step, i) => (
              <div key={i} className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-gray-500">
            <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-400" /> SSL Check</span>
            <span className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-blue-400" /> Mobile Test</span>
            <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-yellow-400" /> Speed Test</span>
            <span className="flex items-center gap-2"><Type className="w-4 h-4 text-purple-400" /> SEO Audit</span>
            <span className="flex items-center gap-2"><Code className="w-4 h-4 text-red-400" /> Code Quality</span>
          </div>
        </div>
      )}

      {/* Loading state */}
      {auditing && (
        <div className="max-w-4xl mx-auto px-4 pb-16 text-center">
          <div className="card p-12">
            <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Analyzing your website...</h3>
            <p className="text-gray-500 text-sm">Checking speed, SEO, mobile, security, and more</p>
            {/* Show preview while loading */}
            {fullUrl && (
              <div className="mt-8 rounded-xl overflow-hidden border border-[#1e1e2e] mx-auto max-w-3xl">
                <iframe src={fullUrl} className="w-full h-[400px] bg-white" sandbox="allow-same-origin" loading="eager" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="max-w-7xl mx-auto px-4 pb-16">
          {/* Score Header */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full border-4 text-5xl font-bold ${
              result.score >= 70 ? 'border-green-500 text-green-400' :
              result.score >= 40 ? 'border-yellow-500 text-yellow-400' :
              'border-red-500 text-red-400'
            }`}>
              {result.score}
            </div>
            <p className="text-gray-400 mt-3 text-lg">
              {result.score >= 70 ? 'Good — but room for improvement' :
               result.score >= 40 ? 'Needs Work — several issues found' :
               'Critical — your website needs serious attention'}
            </p>
            <div className="flex items-center justify-center gap-6 mt-3 text-sm">
              <span className="text-green-400">{passCount} passed</span>
              <span className="text-red-400">{failCount} failed</span>
              <span className="text-yellow-400">{result.issues.length} issues</span>
            </div>
          </div>

          {/* Main Layout: Preview + Audit */}
          <div className="flex gap-6 flex-col lg:flex-row">
            {/* Left: Website Preview */}
            <div className="lg:w-[55%]">
              <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl overflow-hidden">
                {/* Preview Controls */}
                <div className="p-3 border-b border-[#1e1e2e] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/60" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                      <div className="w-3 h-3 rounded-full bg-green-500/60" />
                    </div>
                    <span className="text-xs text-gray-500 ml-2 truncate max-w-[250px]">{fullUrl}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPreviewMode('desktop')}
                      className={`p-1.5 rounded ${previewMode === 'desktop' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-white'}`}>
                      <Monitor className="w-4 h-4" />
                    </button>
                    <button onClick={() => setPreviewMode('mobile')}
                      className={`p-1.5 rounded ${previewMode === 'mobile' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-white'}`}>
                      <Smartphone className="w-4 h-4" />
                    </button>
                    <a href={fullUrl} target="_blank" rel="noopener" className="p-1.5 rounded text-gray-500 hover:text-white">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Preview iframe */}
                <div className={`flex justify-center bg-[#1a1a24] ${previewMode === 'mobile' ? 'py-4' : ''}`}>
                  <div className={`transition-all duration-300 ${
                    previewMode === 'mobile'
                      ? 'w-[375px] h-[667px] rounded-[2rem] border-4 border-gray-700 overflow-hidden shadow-2xl'
                      : 'w-full h-[500px]'
                  }`}>
                    <iframe
                      src={fullUrl}
                      className="w-full h-full bg-white"
                      sandbox="allow-same-origin allow-scripts"
                      loading="eager"
                      style={previewMode === 'mobile' ? { borderRadius: '1.5rem' } : {}}
                    />
                  </div>
                </div>

                {/* Mobile warning */}
                {!result.has_mobile_viewport && previewMode === 'mobile' && (
                  <div className="p-3 bg-red-500/10 border-t border-red-500/20 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-400">This site is NOT mobile-friendly — it will look broken on phones</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Audit Details */}
            <div className="lg:w-[45%] space-y-6">
              {/* Technical Checks */}
              <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Technical Checks</h3>
                <div className="space-y-2.5">
                  {checks.map(check => (
                    <div key={check.label} className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                      check.value ? 'bg-green-500/5' : 'bg-red-500/5'
                    }`}>
                      <div className="flex items-center gap-2">
                        <check.icon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-300">{check.label}</span>
                      </div>
                      {check.value ?
                        <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Pass</span> :
                        <span className="text-xs text-red-400 flex items-center gap-1"><XCircle className="w-4 h-4" /> Fail</span>}
                    </div>
                  ))}
                </div>

                {/* Performance Stats */}
                <div className="mt-4 pt-4 border-t border-[#1e1e2e] grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className={`text-xl font-bold ${result.load_time > 3 ? 'text-red-400' : 'text-green-400'}`}>
                      {result.load_time?.toFixed(1)}s
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase">Load Time</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-300">{result.image_count}</div>
                    <div className="text-[10px] text-gray-500 uppercase">Images</div>
                  </div>
                  <div>
                    <div className={`text-xl font-bold ${result.font_count > 5 ? 'text-yellow-400' : 'text-gray-300'}`}>
                      {result.font_count}
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase">Fonts</div>
                  </div>
                </div>
              </div>

              {/* Issues */}
              <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  {result.issues.length} Issues Found
                </h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {result.issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                      <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-gray-300">{issue}</span>
                    </div>
                  ))}
                  {result.issues.length === 0 && <p className="text-sm text-gray-500">No major issues found!</p>}
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/20 rounded-xl p-8 text-center">
            <h3 className="text-2xl font-bold mb-2">Want These Issues Fixed?</h3>
            <p className="text-gray-400 mb-6 max-w-lg mx-auto">
              Our team at Customation can fix all {result.issues.length} issues and improve your score.
              Free consultation — no strings attached.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="https://wa.me/923001234567?text=Hi%2C%20my%20website%20scored%20{result.score}%2F100%20on%20your%20audit%20tool.%20I%20want%20to%20discuss%20fixing%20the%20issues."
                target="_blank" rel="noopener"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-medium px-6 py-3 rounded-lg transition-all">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Chat on WhatsApp
              </a>
              <a href="mailto:kmubashir182@gmail.com?subject=Website Audit - Score {result.score}/100"
                className="inline-flex items-center gap-2 bg-[#111118] border border-[#1e1e2e] hover:border-purple-500/50 text-gray-300 font-medium px-6 py-3 rounded-lg transition-all">
                Send Email
              </a>
            </div>
          </div>

          {captured && (
            <p className="text-center text-xs text-green-400 mt-4">
              <CheckCircle className="w-3 h-3 inline" /> Full report sent to {email}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#1e1e2e] py-8 text-center">
        <p className="text-xs text-gray-600">
          Built by <a href="https://customation-next-oajw.vercel.app" target="_blank" rel="noopener" className="text-purple-400 hover:underline">Customation</a> — Design &amp; Tech Agency
        </p>
      </footer>
    </div>
  )
}
