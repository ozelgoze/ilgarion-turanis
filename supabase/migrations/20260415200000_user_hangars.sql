-- ============================================================
-- User Ship Hangar System
-- Each user can register multiple ships in their hangar,
-- set one as primary (shown on team rosters), and optionally
-- link an erkul.games loadout URL per ship.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_hangars (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ship_name   text NOT NULL,
  nickname    text,                   -- e.g. "Old Reliable", "The Brick"
  is_primary  boolean NOT NULL DEFAULT false,
  erkul_link  text,                   -- erkul.games DPS calculator loadout URL
  insurance   text,                   -- e.g. "LTI", "10Y", "6M", "3M"
  notes       text,                   -- personal notes
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, ship_name)
);

COMMENT ON TABLE public.user_hangars IS 'Personal ship hangars — each user can register multiple ships.';

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_user_hangars_user ON public.user_hangars(user_id);

-- ── RLS ─────────────────────────────────────────────────────

ALTER TABLE public.user_hangars ENABLE ROW LEVEL SECURITY;

-- Users can view all hangars (needed for team fleet aggregation)
DROP POLICY IF EXISTS "Anyone can view hangars" ON public.user_hangars;
CREATE POLICY "Anyone can view hangars"
  ON public.user_hangars FOR SELECT TO authenticated USING (true);

-- Users can manage their own hangar
DROP POLICY IF EXISTS "Users can insert own hangar" ON public.user_hangars;
CREATE POLICY "Users can insert own hangar"
  ON public.user_hangars FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own hangar" ON public.user_hangars;
CREATE POLICY "Users can update own hangar"
  ON public.user_hangars FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own hangar" ON public.user_hangars;
CREATE POLICY "Users can delete own hangar"
  ON public.user_hangars FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Anon can view hangars (for landing page fleet stats, future use)
DROP POLICY IF EXISTS "Anon can view hangars" ON public.user_hangars;
CREATE POLICY "Anon can view hangars"
  ON public.user_hangars FOR SELECT TO anon USING (true);

-- ── Trigger: Ensure only one primary ship per user ──────────

CREATE OR REPLACE FUNCTION public.ensure_single_primary_ship()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE public.user_hangars
    SET is_primary = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ensure_single_primary ON public.user_hangars;
CREATE TRIGGER trg_ensure_single_primary
  BEFORE INSERT OR UPDATE ON public.user_hangars
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_primary_ship();
