export type Plan = "free" | "pro" | "business";

export type Industry =
  | "E-commerce"
  | "SaaS"
  | "Restaurant"
  | "Healthcare"
  | "Agency"
  | "Other";

export type Sentiment = "positive" | "negative" | "neutral" | "mixed";

export type IntegrationPlatform =
  | "google_business"
  | "yelp"
  | "trustpilot"
  | "app_store"
  | "play_store"
  | "amazon"
  | "g2"
  | "slack"
  | "zapier";

export type IntegrationStatus =
  | "connected"
  | "disconnected"
  | "error"
  | "syncing";

export type SyncStatus = "running" | "success" | "error" | "skipped";

export interface OnboardingChecklist {
  account: boolean;
  survey: boolean;
  firstAnalysis: boolean;
  firstProject: boolean;
  firstExport: boolean;
}

export interface Profile {
  id: string;
  full_name: string | null;
  company: string | null;
  plan: Plan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  reviews_used_this_month: number;
  billing_cycle_start: string;
  onboarding_data: Record<string, unknown>;
  onboarding_completed: boolean;
  onboarding_checklist: OnboardingChecklist;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  industry: Industry;
  review_source: string;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  project_id: string;
  content: string;
  rating: number | null;
  author: string | null;
  source: string | null;
  review_date: string | null;
  sentiment: Sentiment | null;
  sentiment_score: number | null;
  themes: string[];
  created_at: string;
}

export interface AnalysisItem {
  text: string;
  count?: number;
  severity?: "low" | "medium" | "high";
  examples?: string[];
}

export interface ActionItem {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
}

export interface Analysis {
  id: string;
  project_id: string;
  review_count: number;
  summary: string | null;
  sentiment_positive: number | null;
  sentiment_neutral: number | null;
  sentiment_negative: number | null;
  sentiment_mixed: number | null;
  overall_score: number | null;
  complaints: AnalysisItem[];
  praises: AnalysisItem[];
  feature_requests: AnalysisItem[];
  action_items: ActionItem[];
  rating_distribution: Record<string, number>;
  raw_response: unknown;
  created_at: string;
}

export interface NotificationPrefs {
  user_id: string;
  weekly_digest: boolean;
  critical_alerts: boolean;
  monthly_report: boolean;
  updated_at: string;
}

export interface Integration {
  id: string;
  user_id: string;
  platform: IntegrationPlatform;
  status: IntegrationStatus;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  platform_account_id: string | null;
  platform_account_name: string | null;
  project_id: string | null;
  sync_enabled: boolean;
  sync_interval_hours: number;
  last_synced_at: string | null;
  last_error: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  integration_id: string;
  status: SyncStatus;
  reviews_fetched: number;
  reviews_new: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface SharedReport {
  id: string;
  analysis_id: string;
  user_id: string;
  share_token: string;
  is_active: boolean;
  password_hash: string | null;
  expires_at: string | null;
  view_count: number;
  created_at: string;
}

type Insert<T, Required extends keyof T = never> = Partial<T> &
  Pick<T, Required>;
type Update<T> = Partial<T>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Insert<Profile, "id">;
        Update: Update<Profile>;
        Relationships: [];
      };
      projects: {
        Row: Project;
        Insert: Insert<Project, "user_id" | "name">;
        Update: Update<Project>;
        Relationships: [];
      };
      reviews: {
        Row: Review;
        Insert: Insert<Review, "project_id" | "content">;
        Update: Update<Review>;
        Relationships: [];
      };
      analyses: {
        Row: Analysis;
        Insert: Insert<Analysis, "project_id" | "review_count">;
        Update: Update<Analysis>;
        Relationships: [];
      };
      notification_prefs: {
        Row: NotificationPrefs;
        Insert: Insert<NotificationPrefs, "user_id">;
        Update: Update<NotificationPrefs>;
        Relationships: [];
      };
      integrations: {
        Row: Integration;
        Insert: Insert<Integration, "user_id" | "platform">;
        Update: Update<Integration>;
        Relationships: [];
      };
      sync_logs: {
        Row: SyncLog;
        Insert: Insert<SyncLog, "integration_id" | "status">;
        Update: Update<SyncLog>;
        Relationships: [];
      };
      shared_reports: {
        Row: SharedReport;
        Insert: Insert<SharedReport, "analysis_id" | "user_id">;
        Update: Update<SharedReport>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_ms: number };
        Returns: {
          ok: boolean;
          remaining?: number;
          retry_after_sec?: number;
        };
      };
      consume_review_quota: {
        Args: {
          p_review_count: number;
          p_max_reviews_per_month: number;
          p_max_analyses_per_month: number;
          p_enforce_analyses_count: boolean;
        };
        Returns: {
          ok: boolean;
          code?: string;
          limit?: number;
          used?: number;
          reviews_used_after?: number;
          plan?: Plan;
        };
      };
      refund_review_quota: {
        Args: { p_review_count: number };
        Returns: { ok: boolean; code?: string };
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
