-- ============================================================
--   UEE ATAK APP — Realtime DELETE payload fix
--   Ensures DELETE events include the full old row, so
--   postgres_changes filters like `map_id=eq.<uuid>` match on
--   DELETE as well as INSERT/UPDATE.
--
--   Without this, only PK columns are included in the old
--   record on DELETE and the filter would silently drop events.
--
--   Idempotent: ALTER ... REPLICA IDENTITY is a single-value
--   setting, so re-running has no effect after the first run.
-- ============================================================

alter table public.tactical_markers replica identity full;
alter table public.map_drawings     replica identity full;
