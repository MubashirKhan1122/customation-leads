'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Save, Mail, Building, User, Clock, CheckCircle, Key } from 'lucide-react'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    gmail_user: '',
    gmail_app_password: '',
    sender_name: 'Mubashir Khan',
    company_name: 'Customation',
    email_delay_seconds: 5,
    serpapi_key: '',
    google_cse_key: '',
    google_cse_id: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.settings) setSettings(data.settings)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
      setError('Failed to save settings. Please try again.')
    }
    setSaving(false)
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

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your email and company details</p>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        {/* Gmail Config */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-400" /> Gmail Configuration
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Gmail Address</label>
              <input
                type="email"
                value={settings.gmail_user}
                onChange={e => setSettings(s => ({ ...s, gmail_user: e.target.value }))}
                className="input-field w-full"
                placeholder="you@gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">App Password</label>
              <input
                type="password"
                value={settings.gmail_app_password}
                onChange={e => setSettings(s => ({ ...s, gmail_app_password: e.target.value }))}
                className="input-field w-full"
                placeholder="••••••••••••••••"
              />
              <p className="text-xs text-gray-600 mt-1">
                Generate an App Password at myaccount.google.com → Security → 2-Step Verification → App Passwords
              </p>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-400" /> Company Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Sender Name</label>
              <input
                type="text"
                value={settings.sender_name}
                onChange={e => setSettings(s => ({ ...s, sender_name: e.target.value }))}
                className="input-field w-full"
                placeholder="Your Name"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Company Name</label>
              <input
                type="text"
                value={settings.company_name}
                onChange={e => setSettings(s => ({ ...s, company_name: e.target.value }))}
                className="input-field w-full"
                placeholder="Your Company"
              />
            </div>
          </div>
        </div>

        {/* Search API Keys */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-green-400" /> Search API Keys
          </h2>
          <p className="text-xs text-gray-500 mb-4">Configure at least one API for the auto-search feature to work. SerpAPI is recommended.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">SerpAPI Key <span className="text-gray-600">(recommended - 100 free/month)</span></label>
              <input
                type="password"
                value={settings.serpapi_key}
                onChange={e => setSettings(s => ({ ...s, serpapi_key: e.target.value }))}
                className="input-field w-full"
                placeholder="Get from serpapi.com"
              />
            </div>
            <div className="border-t border-[var(--border)] pt-4">
              <label className="block text-sm text-gray-400 mb-2">Google Custom Search API Key <span className="text-gray-600">(100 free/day)</span></label>
              <input
                type="password"
                value={settings.google_cse_key}
                onChange={e => setSettings(s => ({ ...s, google_cse_key: e.target.value }))}
                className="input-field w-full"
                placeholder="Get from console.cloud.google.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Google Custom Search Engine ID</label>
              <input
                type="text"
                value={settings.google_cse_id}
                onChange={e => setSettings(s => ({ ...s, google_cse_id: e.target.value }))}
                className="input-field w-full"
                placeholder="Get from programmablesearchengine.google.com"
              />
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" /> Email Settings
          </h2>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Delay Between Emails (seconds)</label>
            <input
              type="number"
              min="1"
              max="60"
              value={settings.email_delay_seconds}
              onChange={e => setSettings(s => ({ ...s, email_delay_seconds: parseInt(e.target.value) || 5 }))}
              className="input-field w-32"
            />
            <p className="text-xs text-gray-600 mt-1">Minimum 5 seconds recommended to avoid spam filters</p>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
          {saved ? (
            <><CheckCircle className="w-4 h-4" /> Saved!</>
          ) : saving ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
          ) : (
            <><Save className="w-4 h-4" /> Save Settings</>
          )}
        </button>
        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
      </form>
    </DashboardLayout>
  )
}
