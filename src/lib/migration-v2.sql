-- Run in Supabase SQL Editor

-- Email templates table
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

-- Follow-up sequences table
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

-- Add sequence tracking to email_logs
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS sequence_step INTEGER DEFAULT 0;

-- RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on email_templates" ON email_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on follow_up_sequences" ON follow_up_sequences FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_followup_lead_id ON follow_up_sequences(lead_id);
CREATE INDEX IF NOT EXISTS idx_followup_status ON follow_up_sequences(status);
CREATE INDEX IF NOT EXISTS idx_followup_scheduled ON follow_up_sequences(scheduled_at);

-- Insert default templates
INSERT INTO email_templates (name, subject, body_html, template_type, is_default) VALUES
('Initial Outreach', '{{business_name}} - Your website scored {{score}}/100', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;"><p>Hi {{first_name}},</p><p>I just ran a quick audit on your website and found some issues that could be costing you customers.</p><div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;margin:16px 0;border-radius:4px;"><strong>Your Website Score: {{score}}/100</strong> ({{score_label}})</div><p><strong>Key issues found:</strong></p><ul style="padding-left:20px;">{{issues_html}}</ul>{{extra_issues}}<p>These are quick fixes that can dramatically improve your online presence.</p><p>Would you be open to a quick 15-minute call this week? I can walk you through the full report — no strings attached.</p><p>Best,<br/><strong>{{sender_name}}</strong><br/>{{company_name}}</p></div>', 'initial', true),
('Follow Up #1 (3 days)', 'Quick follow up - {{business_name}} website audit', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;"><p>Hi {{first_name}},</p><p>Just following up on my email from a few days ago about your website audit.</p><p>I noticed your site scored <strong>{{score}}/100</strong> — there are a few quick wins that could make a big difference:</p><ul style="padding-left:20px;">{{issues_html}}</ul><p>I''d love to help you fix these — completely free initial consultation. Would 15 minutes work this week?</p><p>Best,<br/><strong>{{sender_name}}</strong><br/>{{company_name}}</p></div>', 'followup1', true),
('Follow Up #2 (7 days)', 'Last chance - Free website fixes for {{business_name}}', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;"><p>Hi {{first_name}},</p><p>I don''t want to be a pest, so this will be my last email.</p><p>Your website has {{issue_count}} issues that are likely costing you customers every day. I genuinely think I can help.</p><p>If you''re ever interested in improving your online presence, just reply to this email and I''ll send over the full audit report.</p><p>Wishing you all the best,<br/><strong>{{sender_name}}</strong><br/>{{company_name}}</p></div>', 'followup2', true),
('Break Up Email', 'Closing your file - {{business_name}}', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;"><p>Hi {{first_name}},</p><p>Since I haven''t heard back, I''m going to assume improving your website isn''t a priority right now — totally understand.</p><p>I''ll close your file, but if things change in the future, feel free to reach out anytime.</p><p>All the best,<br/><strong>{{sender_name}}</strong><br/>{{company_name}}</p></div>', 'breakup', true);
