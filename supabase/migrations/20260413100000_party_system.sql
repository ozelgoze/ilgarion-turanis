-- ============================================================
-- Party / LFG System
-- ============================================================

-- Activity type enum
DO $$ BEGIN
  CREATE TYPE public.party_activity AS ENUM (
    'bounty_hunting', 'cargo_run', 'mining', 'salvage',
    'fps_mission', 'fleet_battle', 'racing', 'exploration',
    'blueprint_run', 'escort', 'medical_rescue', 'piracy', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Party status enum
DO $$ BEGIN
  CREATE TYPE public.party_status AS ENUM ('open', 'full', 'closed', 'in_progress');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Parties table
CREATE TABLE IF NOT EXISTS public.parties (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity    public.party_activity NOT NULL,
  title       text NOT NULL,
  description text,
  min_players smallint NOT NULL DEFAULT 2,
  max_players smallint NOT NULL DEFAULT 4,
  status      public.party_status NOT NULL DEFAULT 'open',
  region      text DEFAULT 'any',
  voice_chat  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.parties IS 'LFG party listings for Star Citizen activities.';

-- Party members join table
CREATE TABLE IF NOT EXISTS public.party_members (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id  uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (party_id, user_id)
);

COMMENT ON TABLE public.party_members IS 'Members who have joined a party.';

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_parties_updated_at ON public.parties;
CREATE TRIGGER set_parties_updated_at
  BEFORE UPDATE ON public.parties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────

ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_members ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view open parties
DROP POLICY IF EXISTS "Anyone can view parties" ON public.parties;
CREATE POLICY "Anyone can view parties"
  ON public.parties FOR SELECT TO authenticated USING (true);

-- Authenticated users can create parties
DROP POLICY IF EXISTS "Users can create parties" ON public.parties;
CREATE POLICY "Users can create parties"
  ON public.parties FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- Creators can update their own parties
DROP POLICY IF EXISTS "Creators can update own parties" ON public.parties;
CREATE POLICY "Creators can update own parties"
  ON public.parties FOR UPDATE TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Creators can delete own parties
DROP POLICY IF EXISTS "Creators can delete own parties" ON public.parties;
CREATE POLICY "Creators can delete own parties"
  ON public.parties FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

-- Anyone can view party members
DROP POLICY IF EXISTS "Anyone can view party members" ON public.party_members;
CREATE POLICY "Anyone can view party members"
  ON public.party_members FOR SELECT TO authenticated USING (true);

-- Users can join parties (insert own membership)
DROP POLICY IF EXISTS "Users can join parties" ON public.party_members;
CREATE POLICY "Users can join parties"
  ON public.party_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can leave parties (delete own membership)
DROP POLICY IF EXISTS "Users can leave parties" ON public.party_members;
CREATE POLICY "Users can leave parties"
  ON public.party_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Realtime publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.parties;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.party_members;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
