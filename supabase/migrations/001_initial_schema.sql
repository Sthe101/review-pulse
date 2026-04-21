-- ============================================================================
-- ReviewPulse — Initial Schema (001)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLES
-- ----------------------------------------------------------------------------

-- User profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free','pro','business')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  reviews_used_this_month INT DEFAULT 0 CHECK (reviews_used_this_month >= 0),
  billing_cycle_start TIMESTAMPTZ DEFAULT NOW(),
  onboarding_data JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_checklist JSONB DEFAULT '{"account":true,"survey":false,"firstAnalysis":false,"firstProject":false,"firstExport":false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects (groupings of reviews)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) <= 200),
  description TEXT CHECK (char_length(description) <= 1000),
  industry TEXT DEFAULT 'Other' CHECK (industry IN ('E-commerce','SaaS','Restaurant','Healthcare','Agency','Other')),
  review_source TEXT DEFAULT 'Mixed',
  is_demo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 10000),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  author TEXT CHECK (char_length(author) <= 200),
  source TEXT CHECK (char_length(source) <= 100),
  review_date DATE,
  sentiment TEXT CHECK (sentiment IN ('positive','negative','neutral','mixed')),
  sentiment_score FLOAT CHECK (sentiment_score >= 0 AND sentiment_score <= 1),
  themes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analysis results
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  review_count INT NOT NULL CHECK (review_count > 0),
  summary TEXT,
  sentiment_positive FLOAT CHECK (sentiment_positive >= 0 AND sentiment_positive <= 100),
  sentiment_neutral FLOAT,
  sentiment_negative FLOAT,
  sentiment_mixed FLOAT,
  overall_score FLOAT CHECK (overall_score >= 0 AND overall_score <= 100),
  complaints JSONB DEFAULT '[]',
  praises JSONB DEFAULT '[]',
  feature_requests JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  rating_distribution JSONB DEFAULT '{}',
  raw_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  weekly_digest BOOLEAN DEFAULT true,
  critical_alerts BOOLEAN DEFAULT true,
  monthly_report BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform integrations (OAuth connections)
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('google_business','yelp','trustpilot','app_store','play_store','amazon','g2','slack','zapier')),
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected','disconnected','error','syncing')),
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  platform_account_id TEXT,
  platform_account_name TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  sync_enabled BOOLEAN DEFAULT true,
  sync_interval_hours INT DEFAULT 6 CHECK (sync_interval_hours >= 1),
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, platform_account_id)
);

-- Sync job logs
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('running','success','error','skipped')),
  reviews_fetched INT DEFAULT 0,
  reviews_new INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Shareable analysis reports (public links)
CREATE TABLE shared_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active BOOLEAN DEFAULT true,
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_reports ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only access their own profile
CREATE POLICY "Users view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects: users can only access their own projects
CREATE POLICY "Users manage own projects" ON projects FOR ALL USING (auth.uid() = user_id);

-- Reviews: through project ownership
CREATE POLICY "Users manage own reviews" ON reviews FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Analyses: through project ownership
CREATE POLICY "Users manage own analyses" ON analyses FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Notification preferences: own only
CREATE POLICY "Users manage own notifications" ON notification_prefs FOR ALL USING (auth.uid() = user_id);

-- Integrations: own only
CREATE POLICY "Users manage own integrations" ON integrations FOR ALL USING (auth.uid() = user_id);

-- Sync logs: through integration ownership
CREATE POLICY "Users view own sync logs" ON sync_logs FOR ALL
  USING (integration_id IN (SELECT id FROM integrations WHERE user_id = auth.uid()));

-- Shared reports: owners can manage, anyone can view active shares
CREATE POLICY "Users manage own shares" ON shared_reports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public read active shares" ON shared_reports FOR SELECT USING (is_active = true);

-- ----------------------------------------------------------------------------
-- AUTO-PROFILE TRIGGER on signup
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  INSERT INTO public.notification_prefs (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- MONTHLY USAGE RESET
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION reset_monthly_usage() RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET reviews_used_this_month = 0, billing_cycle_start = NOW()
  WHERE billing_cycle_start < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_reviews_project ON reviews(project_id);
CREATE INDEX idx_reviews_sentiment ON reviews(sentiment);
CREATE INDEX idx_analyses_project ON analyses(project_id);
CREATE INDEX idx_analyses_created ON analyses(created_at);
CREATE INDEX idx_integrations_user ON integrations(user_id);
CREATE INDEX idx_integrations_status ON integrations(status) WHERE status = 'connected';
CREATE INDEX idx_sync_logs_integration ON sync_logs(integration_id);
CREATE INDEX idx_shared_reports_token ON shared_reports(share_token);
