'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import { Search, Filter, Mail, ExternalLink, Trash2, Eye, Download } from 'lucide-react'
import type { Lead } from '@/lib/supabase'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [scoreFilter, setScoreFilter] = useState<string>('all')
  const [emailFilter, setEmailFilter] = useState<string>('all')

  const fetchLeads = async () => {
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (scoreFilter !== 'all') params.set('score', scoreFilter)
    if (emailFilter !== 'all') params.set('email', emailFilter)
    if (search) params.set('search', search)

    const res = await fetch(`/api/leads?${params}`)
    const data = await res.json()
    setLeads(data.leads || [])
    setLoading(false)
  }

  useEffect(() => { fetchLeads() }, [statusFilter, scoreFilter, emailFilter])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lead?')) return
    await fetch(`/api/leads?id=${id}`, { method: 'DELETE' })
    setLeads(prev => prev.filter(l => l.id !== id))
  }

  const handleStatusChange = async (id: string, status: string) => {
    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: status as Lead['status'] } : l))
  }

  const filtered = leads.filter(l =>
    !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.website.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">All Leads</h1>
          <p className="text-gray-500 mt-1">{filtered.length} leads found</p>
        </div>
        <div className="flex gap-2">
          <a href="/api/export?type=leads" className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </a>
          <a href="/api/export?type=audits" className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Audits CSV
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchLeads()}
              placeholder="Search leads..."
              className="input-field w-full pl-10 py-2 text-sm"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field py-2 text-sm">
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="replied">Replied</option>
            <option value="converted">Converted</option>
            <option value="ignored">Ignored</option>
          </select>
          <select value={scoreFilter} onChange={e => setScoreFilter(e.target.value)} className="input-field py-2 text-sm">
            <option value="all">All Scores</option>
            <option value="hot">Hot (0-59)</option>
            <option value="warm">Warm (60-79)</option>
            <option value="cold">Cold (80+)</option>
          </select>
          <select value={emailFilter} onChange={e => setEmailFilter(e.target.value)} className="input-field py-2 text-sm">
            <option value="all">All Emails</option>
            <option value="has_email">Has Email</option>
            <option value="no_email">No Email</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left text-xs text-gray-500 uppercase px-6 py-3">Business</th>
                <th className="text-left text-xs text-gray-500 uppercase px-6 py-3">Email</th>
                <th className="text-left text-xs text-gray-500 uppercase px-6 py-3">Score</th>
                <th className="text-left text-xs text-gray-500 uppercase px-6 py-3">Status</th>
                <th className="text-left text-xs text-gray-500 uppercase px-6 py-3">Added</th>
                <th className="text-right text-xs text-gray-500 uppercase px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No leads found</td></tr>
              ) : filtered.map(lead => (
                <tr key={lead.id} className="border-b border-[var(--border)] hover:bg-white/[0.02] group">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-white">{lead.name}</div>
                    <a href={lead.website} target="_blank" rel="noopener" className="text-xs text-gray-500 hover:text-purple-400">
                      {lead.website.replace(/https?:\/\//, '').substring(0, 40)}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {lead.email ? (
                      <span className="text-green-400">{lead.email}</span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {lead.score !== null ? (
                      <span className={`font-semibold ${
                        lead.score >= 70 ? 'text-green-400' : lead.score >= 40 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {lead.score}
                        {lead.score < 60 && <span className="ml-1 text-xs">🔥</span>}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={lead.status}
                      onChange={e => handleStatusChange(lead.id, e.target.value)}
                      className="text-xs bg-transparent border border-[var(--border)] rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-purple-500"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="replied">Replied</option>
                      <option value="converted">Converted</option>
                      <option value="ignored">Ignored</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/audit/${lead.id}`} className="p-1.5 rounded hover:bg-purple-500/10 text-gray-400 hover:text-purple-400">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <a href={lead.website} target="_blank" rel="noopener" className="p-1.5 rounded hover:bg-blue-500/10 text-gray-400 hover:text-blue-400">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      {lead.phone && (
                        <a
                          href={`https://wa.me/${lead.phone.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(
                            `Hi ${lead.name.split(' ')[0]}, I noticed your website ${lead.website ? `(${lead.website.replace(/https?:\/\//, '')})` : ''} could use some improvements. I specialize in web design and digital marketing. Would you be interested in a free consultation?`
                          )}`}
                          target="_blank" rel="noopener"
                          className="p-1.5 rounded hover:bg-green-500/10 text-gray-400 hover:text-green-400"
                          title="WhatsApp"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </a>
                      )}
                      <button onClick={() => handleDelete(lead.id)} className="p-1.5 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
