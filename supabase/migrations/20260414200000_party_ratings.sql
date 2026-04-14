-- ============================================================
-- Party Rating System
-- When a leader closes a party, remaining members can rate 0-5 stars.
-- The leader's reputation (last party rating) is shown on new parties.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.party_ratings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id   uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  leader_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rater_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stars      smallint NOT NULL CHECK (stars >= 0 AND stars <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (party_id, rater_id)
);

COMMENT ON TABLE public.party_ratings IS 'Star ratings given by party members to the leader after a party closes.';

-- ── RLS ─────────────────────────────────────────────────────

ALTER TABLE public.party_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view ratings (needed for leader reputation display)
DROP POLICY IF EXISTS "Anyone can view ratings" ON public.party_ratings;
CREATE POLICY "Anyone can view ratings"
  ON public.party_ratings FOR SELECT TO authenticated USING (true);

-- Users can insert their own rating
DROP POLICY IF EXISTS "Users can rate parties" ON public.party_ratings;
CREATE POLICY "Users can rate parties"
  ON public.party_ratings FOR INSERT TO authenticated
  WITH CHECK (rater_id = auth.uid());

-- Realtime publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.party_ratings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
