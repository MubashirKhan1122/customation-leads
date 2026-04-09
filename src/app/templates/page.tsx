'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { FileText, Plus, Save, Trash2, CheckCircle, Edit2 } from 'lucide-react'

interface Template {
  id: string
  name: string
  subject: string
  body_html: string
  template_type: string
  is_default: boolean
  created_at: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Template | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetchTemplates = async () => {
    const res = await fetch('/api/templates')
    const data = await res.json()
    setTemplates(data.templates || [])
    setLoading(false)
  }

  useEffect(() => { fetchTemplates() }, [])

  const saveTemplate = async () => {
    if (!editing) return
    setSaving(true)
    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', ...editing }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    fetchTemplates()
  }

  const createTemplate = async () => {
    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        name: 'New Template',
        subject: '{{business_name}} - Subject here',
        body_html: '<div><p>Hi {{first_name}},</p><p>Your email content here.</p><p>Best,<br/>{{sender_name}}<br/>{{company_name}}</p></div>',
        template_type: 'custom',
      }),
    })
    fetchTemplates()
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return
    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
    if (editing?.id === id) setEditing(null)
    fetchTemplates()
  }

  const typeLabel: Record<string, string> = {
    initial: 'Initial Outreach',
    followup1: 'Follow-up #1',
    followup2: 'Follow-up #2',
    breakup: 'Break-up',
    custom: 'Custom',
  }

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Email Templates</h1>
          <p className="text-gray-500 mt-1">Edit email templates used for outreach and follow-ups</p>
        </div>
        <button onClick={createTemplate} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {/* Variables Help */}
      <div className="card p-4 mb-6">
        <p className="text-xs text-gray-500 mb-2"><strong className="text-gray-400">Available variables:</strong></p>
        <div className="flex flex-wrap gap-2">
          {['{{business_name}}', '{{first_name}}', '{{score}}', '{{score_label}}', '{{issues_html}}', '{{issue_count}}', '{{extra_issues}}', '{{sender_name}}', '{{company_name}}', '{{website}}'].map(v => (
            <code key={v} className="text-[10px] px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">{v}</code>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Template List */}
        <div className="w-1/3 space-y-2">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading...</div>
          ) : templates.map(t => (
            <div key={t.id} onClick={() => setEditing({...t})}
              className={`card p-4 cursor-pointer transition-all ${editing?.id === t.id ? 'border-purple-500/50' : 'card-hover'}`}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-medium text-white truncate">{t.name}</h3>
                {t.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">Default</span>}
              </div>
              <p className="text-[10px] text-gray-500">{typeLabel[t.template_type] || t.template_type}</p>
              <p className="text-xs text-gray-600 truncate mt-1">{t.subject}</p>
            </div>
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1">
          {editing ? (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Edit Template</h2>
                <div className="flex items-center gap-2">
                  {!editing.is_default && (
                    <button onClick={() => deleteTemplate(editing.id)} className="text-gray-500 hover:text-red-400 p-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={saveTemplate} disabled={saving} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50">
                    {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save</>}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Template Name</label>
                  <input type="text" value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})}
                    className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Type</label>
                  <select value={editing.template_type} onChange={e => setEditing({...editing, template_type: e.target.value})}
                    className="input-field">
                    <option value="initial">Initial Outreach</option>
                    <option value="followup1">Follow-up #1</option>
                    <option value="followup2">Follow-up #2</option>
                    <option value="breakup">Break-up</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Subject Line</label>
                  <input type="text" value={editing.subject} onChange={e => setEditing({...editing, subject: e.target.value})}
                    className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Body (HTML)</label>
                  <textarea value={editing.body_html} onChange={e => setEditing({...editing, body_html: e.target.value})}
                    className="input-field w-full min-h-[300px] font-mono text-xs" />
                </div>

                {/* Preview */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Preview</label>
                  <div className="bg-white text-black rounded-lg p-4 text-sm" dangerouslySetInnerHTML={{ __html: editing.body_html }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg text-gray-400">Select a template to edit</h3>
              <p className="text-sm text-gray-600 mt-1">Click any template from the list on the left</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
