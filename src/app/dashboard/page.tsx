'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import StatCard from '@/components/StatCard'
import { Users, Mail, Target, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

interface Stats {
  total_leads: number
  leads_with_email: number
  emails_sent: number
  emails_replied: number
  avg_score: number
  hot_leads: number
  recent_leads: Array<{
    id: string
    name: string
    website: string
    score: number | null
    email: string | null
    status: string
    created_at: string
  }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  const replyRate = stats && stats.emails_sent > 0
    ? ((stats.emails_replied / stats.emails_sent) * 100).toFixed(1)
    : '0'

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your lead generation pipeline</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total Leads" value={stats?.total_leads || 0} icon={Users} color="purple" />
        <StatCard label="With Email" value={stats?.leads_with_email || 0} icon={Target} color="blue" />
        <StatCard label="Emails Sent" value={stats?.emails_sent || 0} icon={Mail} color="green" />
        <StatCard label="Replies" value={stats?.emails_replied || 0} icon={CheckCircle} color="green" />
        <StatCard label="Reply Rate" value={`${replyRate}%`} icon={TrendingUp} color="yellow" />
        <StatCard label="Hot Leads" value={stats?.hot_leads || 0} icon={AlertTriangle} color="red" trend="Score < 60" />
      </div>

      {/* Recent Leads Table */}
      <div className="card">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-white">Recent Leads</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left text-xs text-gray-500 uppercase px-6 py-3">Business</th>
                <th className="text-left text-xs text-gray-500 uppercase px-6 py-3">Website</th>
                <th className="text-left text-xs text-gray-500 uppercase px-6 py-3">Email</th>
                <th className="text-left text-xs text-gray-500 uppercase px-6 py-3">Score</th>
                <th className="text-left text-xs text-gray-500 uppercase px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recent_leads?.map(lead => (
                <tr key={lead.id} className="border-b border-[var(--border)] hover:bg-white/[0.02]">
                  <td className="px-6 py-4 text-sm text-white font-medium">{lead.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    <a href={lead.website} target="_blank" rel="noopener" className="hover:text-purple-400 truncate block max-w-[200px]">
                      {lead.website.replace(/https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {lead.email ? (
                      <span className="text-green-400">{lead.email}</span>
                    ) : (
                      <span className="text-gray-600">Not found</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {lead.score !== null ? (
                      <span className={
                        lead.score >= 70 ? 'text-green-400' :
                        lead.score >= 40 ? 'text-yellow-400' : 'text-red-400'
                      }>
                        {lead.score}/100
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${
                      lead.status === 'new' ? 'bg-blue-500/10 text-blue-400' :
                      lead.status === 'contacted' ? 'bg-yellow-500/10 text-yellow-400' :
                      lead.status === 'replied' ? 'bg-green-500/10 text-green-400' :
                      lead.status === 'converted' ? 'bg-purple-500/10 text-purple-400' :
                      'bg-gray-500/10 text-gray-400'
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!stats?.recent_leads || stats.recent_leads.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No leads yet. Go to <a href="/scrape" className="text-purple-400 hover:underline">Find Leads</a> to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
