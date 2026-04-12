-- ============================================================
-- Add assigned_to column to tactical_markers
-- Allows commanders to assign team members to specific markers
-- ============================================================

alter table public.tactical_markers
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null;

-- Index for looking up markers assigned to a specific user
create index if not exists idx_tactical_markers_assigned_to
  on public.tactical_markers(assigned_to)
  where assigned_to is not null;
