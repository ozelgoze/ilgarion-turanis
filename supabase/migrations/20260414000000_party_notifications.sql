-- ============================================================
-- Party Notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS public.party_notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  party_id   uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  type       text NOT NULL,  -- 'member_joined', 'member_left', 'member_kicked', 'party_started', 'party_closed'
  actor_callsign text NOT NULL,
  party_title    text NOT NULL,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.party_notifications IS 'Notifications for party events (joins, leaves, status changes).';

CREATE INDEX IF NOT EXISTS idx_party_notifications_user ON public.party_notifications(user_id, read, created_at DESC);

-- ── RLS ─────────────────────────────────────────────────────

ALTER TABLE public.party_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.party_notifications;
CREATE POLICY "Users can view own notifications"
  ON public.party_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Anyone authenticated can insert notifications (server actions handle logic)
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.party_notifications;
CREATE POLICY "Authenticated can insert notifications"
  ON public.party_notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Users can update own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.party_notifications;
CREATE POLICY "Users can update own notifications"
  ON public.party_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.party_notifications;
CREATE POLICY "Users can delete own notifications"
  ON public.party_notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());
