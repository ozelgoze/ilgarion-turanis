-- ============================================================
-- Party Chat + Creator Kick Ability
-- ============================================================

-- Party messages table
CREATE TABLE IF NOT EXISTS public.party_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id   uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.party_messages IS 'Chat messages within a party.';

-- Index for fetching messages by party
CREATE INDEX IF NOT EXISTS idx_party_messages_party_id ON public.party_messages(party_id, created_at);

-- ── RLS ─────────────────────────────────────────────────────

ALTER TABLE public.party_messages ENABLE ROW LEVEL SECURITY;

-- Party members can view messages in their party
DROP POLICY IF EXISTS "Party members can view messages" ON public.party_messages;
CREATE POLICY "Party members can view messages"
  ON public.party_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.party_members pm
      WHERE pm.party_id = party_messages.party_id
        AND pm.user_id = auth.uid()
    )
  );

-- Party members can send messages
DROP POLICY IF EXISTS "Party members can send messages" ON public.party_messages;
CREATE POLICY "Party members can send messages"
  ON public.party_messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.party_members pm
      WHERE pm.party_id = party_messages.party_id
        AND pm.user_id = auth.uid()
    )
  );

-- Allow party creators to delete any member from their party (kick)
DROP POLICY IF EXISTS "Creators can kick members" ON public.party_members;
CREATE POLICY "Creators can kick members"
  ON public.party_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.parties p
      WHERE p.id = party_members.party_id
        AND p.creator_id = auth.uid()
    )
  );

-- Drop the old leave-only policy (replaced by the above which covers both)
DROP POLICY IF EXISTS "Users can leave parties" ON public.party_members;

-- Realtime for party messages
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.party_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
