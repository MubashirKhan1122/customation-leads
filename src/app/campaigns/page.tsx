'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { FolderPlus, Users, Mail, Target, BarChart3, Trash2, Edit2, Plus, CheckCircle } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  description: string
  status: string
  total_leads: number
  with_email: number
  avg_score: number
  contacted: number
  replied: number
  created_at: string
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const fetchCampaigns = async () => {
    const res = await fetch('/api/campaigns')
    const data = await res.json()
    setCampaigns(data.campaigns || [])
    setLoading(false)
  }

  useEffect(() => { fetchCampaigns() }, [])

  const createCampaign = async () => {
    if (!newName.trim()) return
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', name: newName, description: newDesc }),
    })
    setNewName('')
    setNewDesc('')
    setShowCreate(false)
    fetchCampaigns()
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm('Delete this campaign? Leads will be unassigned.')) return
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
    fetchCampaigns()
  }

  const toggleStatus = async (camp: Campaign) => {
    const next = camp.status === 'active' ? 'paused' : camp.status === 'paused' ? 'completed' : 'active'
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id: camp.id, name: camp.name, description: camp.description, status: next }),
    })
    fetchCampaigns()
  }

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Campaigns</h1>
          <p className="text-gray-500 mt-1">Organize leads into campaigns and track performance</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Create Campaign</h3>
          <div className="space-y-3 max-w-lg">
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Campaign name (e.g. London Restaurants Q1)"
              className="input-field w-full" />
            <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className="input-field w-full" />
            <div className="flex gap-2">
              <button onClick={createCampaign} className="btn-primary text-sm">Create</button>
              <button onClick={() => setShowCreate(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading...</div>
      ) : campaigns.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderPlus className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No campaigns yet</h3>
          <p className="text-sm text-gray-600">Create a campaign to organize your leads and track outreach performance.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map(camp => (
            <div key={camp.id} className="card card-hover p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{camp.name}</h3>
                  {camp.description && <p className="text-xs text-gray-500 mt-1">{camp.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleStatus(camp)}
                    className={`text-[10px] px-2 py-1 rounded-full ${
                      camp.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      camp.status === 'paused' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                      'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                    }`}>
                    {camp.status}
                  </button>
                  <button onClick={() => deleteCampaign(camp.id)} className="p-1 text-gray-600 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-white">{camp.total_leads}</div>
                  <div className="text-[10px] text-gray-500 flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Leads</div>
                </div>
                <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-green-400">{camp.with_email}</div>
                  <div className="text-[10px] text-gray-500 flex items-center justify-center gap-1"><Mail className="w-3 h-3" /> Emails</div>
                </div>
                <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-purple-400">{camp.avg_score}</div>
                  <div className="text-[10px] text-gray-500 flex items-center justify-center gap-1"><BarChart3 className="w-3 h-3" /> Avg Score</div>
                </div>
                <div className="bg-white/[0.02] rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-blue-400">{camp.replied}</div>
                  <div className="text-[10px] text-gray-500 flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" /> Replied</div>
                </div>
              </div>

              <p className="text-[10px] text-gray-600 mt-3">Created {new Date(camp.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
