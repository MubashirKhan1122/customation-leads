'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Clock, Mail, CheckCircle, XCircle, Loader2, Play, AlertTriangle, Calendar } from 'lucide-react'

interface FollowUp {
  id: string
  sequence_step: number
  template_type: string
  scheduled_at: string
  sent_at: string | null
  status: string
  leads: { name: string; email: string; website: string; score: number | null } | null
}

export default function FollowupsPage() {
  const [pending, setPending] = useState<FollowUp[]>([])
  const [sent, setSent] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState('')

  const fetchData = async () => {
    const res = await fetch('/api/followups')
    const data = await res.json()
    setPending(data.pending || [])
    setSent(data.sent || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const processNow = async () => {
    setProcessing(true)
    setResult('')
    try {
      const res = await fetch('/api/followups', { method: 'POST' })
      const data = await res.json()
      setResult(`Processed ${data.processed} follow-ups: ${data.results?.map((r: any) => `${r.lead} (${r.status})`).join(', ') || 'none due'}`)
      fetchData()
    } catch {
      setResult('Error processing follow-ups')
    }
    setProcessing(false)
  }

  const cancelFollowUp = async (id: string) => {
    await fetch('/api/followups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'cancelled' }),
    })
    fetchData()
  }

  const stepLabel = (step: number) => {
    if (step === 1) return 'Follow-up #1'
    if (step === 2) return 'Follow-up #2'
    if (step === 3) return 'Break-up Email'
    return `Step ${step}`
  }

  const daysUntil = (date: string) => {
    const diff = new Date(date).getTime() - Date.now()
    const days = Math.ceil(diff / 86400000)
    if (days < 0) return 'Overdue'
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    return `In ${days} days`
  }

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Follow-ups</h1>
          <p className="text-gray-500 mt-1">Manage automated email follow-up sequences</p>
        </div>
        <button onClick={processNow} disabled={processing}
          className="btn-primary flex items-center gap-2 disabled:opacity-50">
          {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><Play className="w-4 h-4" /> Send Due Now</>}
        </button>
      </div>

      {result && (
        <div className="card p-4 mb-6 text-sm text-gray-300">{result}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{pending.length}</div>
          <div className="text-xs text-gray-500 mt-1">Pending</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{pending.filter(p => new Date(p.scheduled_at) <= new Date()).length}</div>
          <div className="text-xs text-gray-500 mt-1">Overdue</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{sent.length}</div>
          <div className="text-xs text-gray-500 mt-1">Sent</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-gray-400">{pending.filter(p => p.status === 'cancelled').length}</div>
          <div className="text-xs text-gray-500 mt-1">Cancelled</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-6">
          {/* Pending */}
          <div className="card">
            <div className="p-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-400" /> Pending Follow-ups ({pending.length})
              </h2>
            </div>
            {pending.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No pending follow-ups</div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {pending.map(f => (
                  <div key={f.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02]">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">{f.leads?.name || 'Unknown'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">{stepLabel(f.sequence_step)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded ${
                          new Date(f.scheduled_at) <= new Date() ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                        }`}>{daysUntil(f.scheduled_at)}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {f.leads?.email} · Scheduled: {new Date(f.scheduled_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button onClick={() => cancelFollowUp(f.id)} className="text-xs text-gray-500 hover:text-red-400 px-3 py-1 rounded hover:bg-red-500/10">
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sent */}
          <div className="card">
            <div className="p-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" /> Recently Sent ({sent.length})
              </h2>
            </div>
            {sent.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No follow-ups sent yet</div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {sent.map(f => (
                  <div key={f.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">{f.leads?.name || 'Unknown'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/10 text-green-400">{stepLabel(f.sequence_step)}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {f.leads?.email} · Sent: {f.sent_at ? new Date(f.sent_at).toLocaleString() : '—'}
                      </div>
                    </div>
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
