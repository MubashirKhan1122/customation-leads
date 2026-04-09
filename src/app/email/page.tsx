'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Mail, Send, Eye, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface LeadForEmail {
  id: string
  name: string
  email: string
  website: string
  score: number | null
  status: string
  issues: string[]
}

export default function EmailPage() {
  const [leads, setLeads] = useState<LeadForEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [sendProgress, setSendProgress] = useState('')
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null)
  const [previewLead, setPreviewLead] = useState<LeadForEmail | null>(null)
  const [sendResults, setSendResults] = useState<Map<string, 'sent' | 'failed'>>(new Map())

  useEffect(() => {
    fetch('/api/leads?email=has_email')
      .then(r => r.json())
      .then(async data => {
        const leadsWithAudits: LeadForEmail[] = []
        for (const lead of (data.leads || [])) {
          if (!lead.email) continue
          try {
            const auditRes = await fetch(`/api/audit?lead_id=${lead.id}`)
            const auditData = await auditRes.json()
            leadsWithAudits.push({
              ...lead,
              issues: auditData.audit?.issues || [],
            })
          } catch {
            leadsWithAudits.push({ ...lead, issues: [] })
          }
        }
        setLeads(leadsWithAudits)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === leads.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(leads.map(l => l.id)))
    }
  }

  const previewEmail = async (lead: LeadForEmail) => {
    setPreviewLead(lead)
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', lead_id: lead.id, to: lead.email, lead_name: lead.name, issues: lead.issues, score: lead.score }),
      })
      const data = await res.json()
      setPreview({ subject: data.subject, html: data.html })
    } catch {
      setPreview(null)
    }
  }

  const sendEmails = async () => {
    const selectedLeads = leads.filter(l => selected.has(l.id))
    if (selectedLeads.length === 0) return

    setSending(true)
    setSendResults(new Map())

    for (let i = 0; i < selectedLeads.length; i++) {
      const lead = selectedLeads[i]
      setSendProgress(`Sending ${i + 1}/${selectedLeads.length} to ${lead.email}...`)

      try {
        const res = await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send',
            lead_id: lead.id,
            to: lead.email,
            lead_name: lead.name,
            issues: lead.issues,
            score: lead.score,
          }),
        })
        const data = await res.json()
        setSendResults(prev => new Map(prev).set(lead.id, data.success ? 'sent' : 'failed'))
      } catch {
        setSendResults(prev => new Map(prev).set(lead.id, 'failed'))
      }

      // Rate limit: 5 second delay between emails
      if (i < selectedLeads.length - 1) {
        setSendProgress(`Waiting 5 seconds before next email...`)
        await new Promise(r => setTimeout(r, 5000))
      }
    }

    setSending(false)
    setSendProgress(`Done! Sent ${selectedLeads.length} emails.`)
  }

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Email Center</h1>
          <p className="text-gray-500 mt-1">Send personalized cold emails based on audit results</p>
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <button onClick={sendEmails} disabled={sending} className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {sending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
              ) : (
                <><Send className="w-4 h-4" /> Send to {selected.size} leads</>
              )}
            </button>
          )}
        </div>
      </div>

      {sendProgress && (
        <div className="card p-4 mb-6 flex items-center gap-3">
          {sending && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
          <span className="text-sm text-gray-300">{sendProgress}</span>
        </div>
      )}

      {/* Email Preview Modal */}
      {preview && previewLead && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold text-white">Email Preview</h3>
              <p className="text-sm text-gray-400 mt-1">To: {previewLead.email}</p>
              <p className="text-sm text-gray-400">Subject: {preview.subject}</p>
            </div>
            <div className="p-6 bg-white text-black rounded-b-xl" dangerouslySetInnerHTML={{ __html: preview.html }} />
          </div>
        </div>
      )}

      {/* Leads List */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <label className="flex items-center gap-3 text-sm text-gray-400 cursor-pointer">
            <input type="checkbox" checked={selected.size === leads.length && leads.length > 0} onChange={selectAll} className="rounded" />
            Select All ({leads.length} leads with emails)
          </label>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Mail className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p>No leads with emails found.</p>
              <p className="text-sm mt-1">Go to <a href="/scrape" className="text-purple-400 hover:underline">Find Leads</a> to scrape some businesses first.</p>
            </div>
          ) : leads.map(lead => (
            <div key={lead.id} className="p-4 flex items-center gap-4 hover:bg-white/[0.02]">
              <input
                type="checkbox"
                checked={selected.has(lead.id)}
                onChange={() => toggleSelect(lead.id)}
                className="rounded"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{lead.name}</span>
                  {lead.score !== null && lead.score < 60 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">Hot 🔥</span>
                  )}
                </div>
                <span className="text-xs text-gray-500">{lead.email}</span>
              </div>
              <div className="text-sm text-gray-400">
                {lead.issues.length} issues found
              </div>
              <div className="flex items-center gap-2">
                {sendResults.get(lead.id) === 'sent' && <CheckCircle className="w-4 h-4 text-green-400" />}
                {sendResults.get(lead.id) === 'failed' && <XCircle className="w-4 h-4 text-red-400" />}
                <button onClick={() => previewEmail(lead)} className="p-2 rounded hover:bg-purple-500/10 text-gray-400 hover:text-purple-400">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
