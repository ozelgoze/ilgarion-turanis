-- ============================================================
-- Party Ready-Up System
-- ============================================================

-- Add ready column to party_members
ALTER TABLE public.party_members
  ADD COLUMN IF NOT EXISTS ready boolean NOT NULL DEFAULT false;

-- Allow members to update their own ready status
-- (The existing "Commanders can update member roles" policy uses is_team_commander
--  which is for teams, not parties. We need a party-specific update policy.)
DROP POLICY IF EXISTS "Members can update own party membership" ON public.party_members;
CREATE POLICY "Members can update own party membership"
  ON public.party_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
