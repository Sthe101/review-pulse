-- ============================================================================
-- ReviewPulse — Share view increment RPC (004)
-- ============================================================================
-- The public report page (/report/[token]) is unauthenticated. The RLS
-- policies on `shared_reports` let anon SELECT active rows but block UPDATE
-- (the "Users manage own shares" FOR ALL policy keys on auth.uid()). To bump
-- view_count without weakening the row policies, expose a SECURITY DEFINER
-- function scoped to a single column update.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_share_view(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INT;
BEGIN
  UPDATE shared_reports
  SET view_count = view_count + 1
  WHERE share_token = p_token
    AND is_active = true;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_share_view(TEXT) TO anon, authenticated;
