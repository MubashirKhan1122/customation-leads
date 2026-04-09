'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import ScoreRing from '@/components/ScoreRing'
import { ArrowLeft, Globe, Clock, Shield, Smartphone, Type, FileText, Image, Code, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import type { Lead, Audit } from '@/lib/supabase'

export default function AuditPage() {
  const params = useParams()
  const [lead, setLead] = useState<Lead | null>(null)
  const [audit, setAudit] = useState<Audit | null>(null)
  const [loading, setLoading] = useState(true)
  const [auditing, setAuditing] = useState(false)
  const [notes, setNotes] = useState<Array<{id: string; content: string; created_at: string}>>([])
  const [newNote, setNewNote] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    fetch(`/api/audit?lead_id=${params.id}`)
      .then(r => r.json())
      .then(data => {
        setLead(data.lead)
        setTags(data.lead?.tags || [])
        setAudit(data.audit)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id])

  useEffect(() => {
    if (!params.id) return
    fetch(`/api/notes?lead_id=${params.id}`).then(r => r.json()).then(d => setNotes(d.notes || []))
  }, [params.id])

  const addNote = async () => {
    if (!newNote.trim() || !lead) return
    const res = await fetch('/api/notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: lead.id, content: newNote }),
    })
    const data = await res.json()
    if (data.note) { setNotes(prev => [data.note, ...prev]); setNewNote('') }
  }

  const deleteNote = async (id: string) => {
    await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const addTag = async () => {
    if (!newTag.trim() || !lead) return
    const updated = [...tags, newTag.trim().toLowerCase()]
    await fetch('/api/tags', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: lead.id, tags: updated }),
    })
    setTags(updated)
    setNewTag('')
  }

  const removeTag = async (tag: string) => {
    if (!lead) return
    const updated = tags.filter(t => t !== tag)
    await fetch('/api/tags', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: lead.id, tags: updated }),
    })
    setTags(updated)
  }

  const runAudit = async () => {
    if (!lead) return
    setAuditing(true)
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: lead.id, url: lead.website }),
      })
      const data = await res.json()
      setAudit(data.audit)
    } catch (err) {
      console.error(err)
    }
    setAuditing(false)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!lead) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-gray-500">Lead not found</p>
          <Link href="/leads" className="text-purple-400 hover:underline mt-2 inline-block">Back to leads</Link>
        </div>
      </DashboardLayout>
    )
  }

  const checks = audit ? [
    { label: 'SSL/HTTPS', value: audit.has_ssl, icon: Shield },
    { label: 'Mobile Friendly', value: audit.has_mobile_viewport, icon: Smartphone },
    { label: 'Page Title', value: audit.has_title, icon: Type },
    { label: 'Meta Description', value: audit.has_meta_description, icon: FileText },
    { label: 'H1 Heading', value: audit.has_h1, icon: Type },
    { label: 'Open Graph Tags', value: audit.has_og_tags, icon: Code },
    { label: 'Analytics', value: audit.has_analytics, icon: Code },
  ] : []

  return (
    <DashboardLayout>
      <Link href="/leads" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Leads
      </Link>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{lead.name}</h1>
            <a href={lead.website} target="_blank" rel="noopener" className="text-purple-400 hover:underline flex items-center gap-1 mt-1">
              <Globe className="w-4 h-4" /> {lead.website}
            </a>
            {lead.email && <p className="text-green-400 text-sm mt-2">Email: {lead.email}</p>}
          </div>
          <div className="flex items-center gap-4">
            {audit && <ScoreRing score={audit.score} size={100} />}
            <button onClick={runAudit} disabled={auditing} className="btn-primary text-sm disabled:opacity-50">
              {auditing ? 'Auditing...' : audit ? 'Re-Audit' : 'Run Audit'}
            </button>
          </div>
        </div>
      </div>

      {audit ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Checks */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Technical Checks</h2>
            <div className="space-y-3">
              {checks.map(check => (
                <div key={check.label} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-3">
                    <check.icon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-300">{check.label}</span>
                  </div>
                  {check.value ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="mt-6 pt-4 border-t border-[var(--border)] space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-2"><Clock className="w-4 h-4" /> Load Time</span>
                <span className={audit.load_time && audit.load_time > 3 ? 'text-red-400' : 'text-green-400'}>
                  {audit.load_time?.toFixed(1)}s
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-2"><Image className="w-4 h-4" /> Images</span>
                <span className="text-gray-300">{audit.image_count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-2"><FileText className="w-4 h-4" /> Content Length</span>
                <span className="text-gray-300">{audit.content_length?.toLocaleString()} chars</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-2"><Type className="w-4 h-4" /> Fonts</span>
                <span className={audit.font_count > 5 ? 'text-yellow-400' : 'text-gray-300'}>{audit.font_count}</span>
              </div>
            </div>
          </div>

          {/* Issues */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Issues Found ({audit.issues?.length || 0})
            </h2>
            {audit.issues?.length ? (
              <div className="space-y-2">
                {audit.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{issue}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No major issues found!</p>
            )}
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg text-gray-400 mb-2">No audit data yet</h3>
          <p className="text-sm text-gray-600 mb-4">Run an audit to analyze this website</p>
          <button onClick={runAudit} disabled={auditing} className="btn-primary disabled:opacity-50">
            {auditing ? 'Auditing...' : 'Run Audit Now'}
          </button>
        </div>
      )}

      {/* Notes & Tags */}
      {lead && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Tags */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Tags</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map(tag => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-red-400 ml-1">&times;</button>
                </span>
              ))}
              {tags.length === 0 && <span className="text-xs text-gray-600">No tags yet</span>}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="Add tag (e.g. high-budget, follow-up)" className="input-field flex-1 text-sm py-1.5" />
              <button onClick={addTag} className="btn-secondary text-sm px-3 py-1.5">Add</button>
            </div>
          </div>

          {/* Notes */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Notes</h2>
            <div className="flex gap-2 mb-4">
              <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNote()}
                placeholder="Add a note..." className="input-field flex-1 text-sm py-1.5" />
              <button onClick={addNote} className="btn-primary text-sm px-3 py-1.5">Add</button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {notes.map(note => (
                <div key={note.id} className="p-3 rounded-lg bg-white/[0.02] border border-[var(--border)] flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-300">{note.content}</p>
                    <p className="text-[10px] text-gray-600 mt-1">{new Date(note.created_at).toLocaleString()}</p>
                  </div>
                  <button onClick={() => deleteNote(note.id)} className="text-gray-600 hover:text-red-400 text-xs ml-2">&#x2715;</button>
                </div>
              ))}
              {notes.length === 0 && <p className="text-xs text-gray-600">No notes yet</p>}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
