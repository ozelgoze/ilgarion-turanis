-- ============================================================
-- Party System Improvements
-- Private parties (passcode), activity log, completion outcome
-- ============================================================

-- ── New columns on parties table ──────────────────────────────

-- Private party passcode (null = public)
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS passcode text DEFAULT NULL;

-- Completion outcome set when party closes
-- null while open, set on close
DO $$ BEGIN
  CREATE TYPE public.party_outcome AS ENUM ('success', 'fail', 'abandoned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS outcome public.party_outcome DEFAULT NULL;

-- ── Party activity log ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.party_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id   uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,  -- 'join', 'leave', 'kick', 'status_change', 'created', 'edit'
  detail     text,           -- e.g. "Status changed to in_progress", "Kicked SHADOW-7"
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.party_events IS 'Activity log for party lifecycle events.';

CREATE INDEX IF NOT EXISTS idx_party_events_party ON public.party_events(party_id, created_at);

-- ── RLS ─────────────────────────────────────────────────────

ALTER TABLE public.party_events ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view events (party members see the log)
DROP POLICY IF EXISTS "Anyone can view party events" ON public.party_events;
CREATE POLICY "Anyone can view party events"
  ON public.party_events FOR SELECT TO authenticated USING (true);

-- Only server actions insert events (via service role), but allow authenticated insert
-- so server actions with user context can write
DROP POLICY IF EXISTS "Authenticated can insert events" ON public.party_events;
CREATE POLICY "Authenticated can insert events"
  ON public.party_events FOR INSERT TO authenticated
  WITH CHECK (true);

-- Realtime publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.party_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
