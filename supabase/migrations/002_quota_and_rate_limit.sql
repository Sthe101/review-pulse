-- ============================================================================
-- ReviewPulse — Atomic Quotas + Rate Limiting (002)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- RATE LIMITING
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limit_buckets_reset_at_idx
  ON rate_limit_buckets(reset_at);

-- Enforce: only the SECURITY DEFINER function can read/write this table.
ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;
-- (no policies → all direct access is denied; the function bypasses RLS via DEFINER)

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_max INT,
  p_window_ms INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_window INTERVAL := (p_window_ms::TEXT || ' milliseconds')::INTERVAL;
  v_count INT;
  v_reset_at TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'rate_limit_requires_auth';
  END IF;

  LOOP
    SELECT count, reset_at
      INTO v_count, v_reset_at
      FROM rate_limit_buckets
     WHERE key = p_key
     FOR UPDATE;

    IF NOT FOUND THEN
      BEGIN
        INSERT INTO rate_limit_buckets (key, count, reset_at)
        VALUES (p_key, 1, v_now + v_window);
        RETURN jsonb_build_object(
          'ok', true,
          'remaining', p_max - 1
        );
      EXCEPTION WHEN unique_violation THEN
        CONTINUE;
      END;
    END IF;

    IF v_reset_at <= v_now THEN
      UPDATE rate_limit_buckets
         SET count = 1, reset_at = v_now + v_window
       WHERE key = p_key;
      RETURN jsonb_build_object(
        'ok', true,
        'remaining', p_max - 1
      );
    END IF;

    IF v_count >= p_max THEN
      RETURN jsonb_build_object(
        'ok', false,
        'retry_after_sec', GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_reset_at - v_now))))::INT
      );
    END IF;

    UPDATE rate_limit_buckets
       SET count = count + 1
     WHERE key = p_key;
    RETURN jsonb_build_object(
      'ok', true,
      'remaining', p_max - v_count - 1
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, INT, INT) TO authenticated;

-- ----------------------------------------------------------------------------
-- ATOMIC PLAN-QUOTA RESERVATION
-- ----------------------------------------------------------------------------
-- Locks the caller's profile row, checks both the monthly review quota and
-- (optionally) the analyses-per-month cap, then atomically increments the
-- usage counter. Returns a JSON envelope with ok/code/limit/used/reviews_used_after.

CREATE OR REPLACE FUNCTION consume_review_quota(
  p_review_count INT,
  p_max_reviews_per_month INT,
  p_max_analyses_per_month INT,
  p_enforce_analyses_count BOOLEAN
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_used INT;
  v_plan TEXT;
  v_analyses_count INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'consume_review_quota_requires_auth';
  END IF;

  IF p_review_count <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_n');
  END IF;

  SELECT reviews_used_this_month, plan
    INTO v_used, v_plan
    FROM profiles
   WHERE id = v_uid
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'profile_not_found');
  END IF;

  IF v_used + p_review_count > p_max_reviews_per_month THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'monthly_review_quota',
      'limit', p_max_reviews_per_month,
      'used', v_used
    );
  END IF;

  IF p_enforce_analyses_count THEN
    SELECT COUNT(*)
      INTO v_analyses_count
      FROM analyses a
      JOIN projects p ON p.id = a.project_id
     WHERE p.user_id = v_uid
       AND a.created_at >= date_trunc('month', NOW());

    IF v_analyses_count >= p_max_analyses_per_month THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'analyses_quota',
        'limit', p_max_analyses_per_month,
        'used', v_analyses_count
      );
    END IF;
  END IF;

  UPDATE profiles
     SET reviews_used_this_month = reviews_used_this_month + p_review_count
   WHERE id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'reviews_used_after', v_used + p_review_count,
    'plan', v_plan
  );
END;
$$;

GRANT EXECUTE ON FUNCTION consume_review_quota(INT, INT, INT, BOOLEAN) TO authenticated;

-- Refund: subtracts a previously-reserved count (used when the analysis fails
-- after consume_review_quota succeeded). Floors at 0 so a stuck refund cannot
-- make the counter negative.

CREATE OR REPLACE FUNCTION refund_review_quota(
  p_review_count INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'refund_review_quota_requires_auth';
  END IF;

  IF p_review_count <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_n');
  END IF;

  UPDATE profiles
     SET reviews_used_this_month = GREATEST(0, reviews_used_this_month - p_review_count)
   WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION refund_review_quota(INT) TO authenticated;
