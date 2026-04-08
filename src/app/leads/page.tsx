'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import { Search, Filter, Mail, ExternalLink, Trash2, Eye } from 'lucide-react'
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
