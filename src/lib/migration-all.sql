-- CUSTOMATION LEAD MACHINE — FULL DATABASE SETUP
-- Run this ONCE in Supabase SQL Editor to set up everything
-- Safe to run multiple times (uses IF NOT EXISTS)

-- ============================================
-- CORE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  category TEXT,
  source_query TEXT,
  score INTEGER,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'replied', 'converted', 'ignored')),
  tags TEXT[] DEFAULT '{}',
  campaign_id UUID,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  load_time REAL,
  has_ssl BOOLEAN DEFAULT FALSE,
  has_mobile_viewport BOOLEAN DEFAULT FALSE,
  has_title BOOLEAN DEFAULT FALSE,
  has_meta_description BOOLEAN DEFAULT FALSE,
  has_h1 BOOLEAN DEFAULT FALSE,
  has_og_tags BOOLEAN DEFAULT FALSE,
  has_analytics BOOLEAN DEFAULT FALSE,
  image_count INTEGER DEFAULT 0,
  content_length INTEGER DEFAULT 0,
  font_count INTEGER DEFAULT 0,
  issues JSONB DEFAULT '[]',
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'replied', 'pending', 'opened', 'clicked')),
  sequence_step INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gmail_user TEXT,
  gmail_app_password TEXT,
  sender_name TEXT DEFAULT 'Mubashir Khan',
  company_name TEXT DEFAULT 'Customation',
  email_delay_seconds INTEGER DEFAULT 5,
  serpapi_key TEXT DEFAULT '',
  google_cse_key TEXT DEFAULT '',
  google_cse_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EMAIL TEMPLATES & FOLLOW-UPS
-- ============================================

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  template_type TEXT DEFAULT 'initial' CHECK (template_type IN ('initial', 'followup1', 'followup2', 'breakup', 'custom')),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follow_up_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  email_log_id UUID REFERENCES email_logs(id) ON DELETE CASCADE,
  sequence_step INTEGER DEFAULT 1,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'skipped')),
  template_type TEXT DEFAULT 'followup1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTES & CAMPAIGNS
-- ============================================

CREATE TABLE IF NOT EXISTS lead_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe FK add
DO $$ BEGIN
  ALTER TABLE leads ADD CONSTRAINT leads_campaign_fk FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_audits_lead_id ON audits(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_lead_id ON email_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_followup_lead_id ON follow_up_sequences(lead_id);
CREATE INDEX IF NOT EXISTS idx_followup_status ON follow_up_sequences(status);
CREATE INDEX IF NOT EXISTS idx_followup_scheduled ON follow_up_sequences(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "allow_all_leads" ON leads FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_audits" ON audits FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_email_logs" ON email_logs FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_settings" ON settings FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_templates" ON email_templates FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_followups" ON follow_up_sequences FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_notes" ON lead_notes FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_campaigns" ON campaigns FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- DEFAULT EMAIL TEMPLATES
-- ============================================

INSERT INTO email_templates (name, subject, body_html, template_type, is_default)
SELECT 'Initial Outreach', '{{business_name}} - Your website scored {{score}}/100',
'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;"><p>Hi {{first_name}},</p><p>I just ran a quick audit on your website and found some issues that could be costing you customers.</p><div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;margin:16px 0;border-radius:4px;"><strong>Your Website Score: {{score}}/100</strong> ({{score_label}})</div><p><strong>Key issues found:</strong></p><ul style="padding-left:20px;">{{issues_html}}</ul>{{extra_issues}}<p>Would you be open to a quick 15-minute call this week?</p><p>Best,<br/><strong>{{sender_name}}</strong><br/>{{company_name}}</p></div>',
'initial', true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE template_type = 'initial' AND is_default = true);

INSERT INTO email_templates (name, subject, body_html, template_type, is_default)
SELECT 'Follow Up #1', 'Quick follow up - {{business_name}} website audit',
'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;"><p>Hi {{first_name}},</p><p>Just following up on my email about your website audit. Your site scored <strong>{{score}}/100</strong>.</p><ul style="padding-left:20px;">{{issues_html}}</ul><p>Free consultation — would 15 minutes work this week?</p><p>Best,<br/><strong>{{sender_name}}</strong><br/>{{company_name}}</p></div>',
'followup1', true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE template_type = 'followup1' AND is_default = true);

INSERT INTO email_templates (name, subject, body_html, template_type, is_default)
SELECT 'Follow Up #2', 'Last chance - Free website fixes for {{business_name}}',
'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;"><p>Hi {{first_name}},</p><p>This will be my last email. Your website has {{issue_count}} issues costing you customers daily.</p><p>If you are ever interested, just reply.</p><p>All the best,<br/><strong>{{sender_name}}</strong><br/>{{company_name}}</p></div>',
'followup2', true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE template_type = 'followup2' AND is_default = true);

INSERT INTO email_templates (name, subject, body_html, template_type, is_default)
SELECT 'Break Up', 'Closing your file - {{business_name}}',
'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;"><p>Hi {{first_name}},</p><p>Since I have not heard back, I will close your file. Feel free to reach out anytime.</p><p>All the best,<br/><strong>{{sender_name}}</strong><br/>{{company_name}}</p></div>',
'breakup', true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE template_type = 'breakup' AND is_default = true);
