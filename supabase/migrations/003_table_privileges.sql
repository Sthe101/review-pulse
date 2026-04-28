-- ============================================================================
-- ReviewPulse — Table Privileges (003)
-- ============================================================================
-- The initial migration enabled RLS but did not GRANT table-level privileges
-- to the `authenticated`, `anon`, or `service_role` PostgREST roles. Without
-- these grants, every INSERT/UPDATE/DELETE through PostgREST returns
-- `permission denied for table <name>` (PG error 42501) — RLS never even
-- gets a chance to run, because the role lacks the underlying privilege.
--
-- This was caught by the projects E2E suite when both an admin (service_role)
-- seed and a browser-side authenticated insert returned 42501. SELECT worked
-- because Supabase's default `usage` grants on `public` cover SELECT in some
-- configurations, but write privileges were never granted explicitly.
--
-- Granting at the role level here; RLS policies (defined in 001) continue to
-- gate which rows each role can see/modify.
-- ----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.projects,
  public.reviews,
  public.analyses,
  public.notification_prefs,
  public.integrations,
  public.sync_logs,
  public.shared_reports
TO authenticated, service_role;

-- `anon` only needs SELECT on shared_reports (public-share use case).
GRANT SELECT ON TABLE public.shared_reports TO anon;

-- Sequences (gen_random_uuid covers most PKs, but grant for any future
-- bigserial/identity columns).
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Apply the same defaults to anything created later in this migration set.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;
