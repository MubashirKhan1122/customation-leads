-- Run this in Supabase SQL editor to create tables

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
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'replied')),
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_audits_lead_id ON audits(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_lead_id ON email_logs(lead_id);

-- Enable RLS (but allow all for now since we use service role)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policies allowing all access (simple auth - refine later for multi-tenant)
CREATE POLICY "Allow all on leads" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on audits" ON audits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on email_logs" ON email_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on settings" ON settings FOR ALL USING (true) WITH CHECK (true);
