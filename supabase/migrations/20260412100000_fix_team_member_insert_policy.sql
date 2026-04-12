-- Fix: The team_members INSERT and SELECT policies both reference
-- team_members, causing infinite recursion. Solution: use a
-- security-definer helper function that bypasses RLS.

-- Helper: check if a user is a commander of a given team (bypasses RLS)
create or replace function public.is_team_commander(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id
      and user_id = p_user_id
      and role = 'commander'
  );
$$;

-- Helper: check if a user is a member of a given team (bypasses RLS)
create or replace function public.is_team_member(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id
      and user_id = p_user_id
  );
$$;

-- ── Fix SELECT policy (also had self-reference) ─────────────────
drop policy if exists "Members can view team roster" on public.team_members;
create policy "Members can view team roster"
  on public.team_members for select to authenticated
  using (
    public.is_team_member(team_id, auth.uid())
  );

-- ── Fix INSERT policy ───────────────────────────────────────────
drop policy if exists "Commanders can add members" on public.team_members;
create policy "Commanders can add members"
  on public.team_members for insert to authenticated
  with check (
    -- Case 1: existing commander adding a member
    public.is_team_commander(team_id, auth.uid())
    -- Case 2: team creator bootstrapping their own commander membership
    or (
      user_id = auth.uid()
      and role = 'commander'
      and team_id in (
        select t.id from public.teams t where t.created_by = auth.uid()
      )
    )
  );

-- ── Fix UPDATE policy ───────────────────────────────────────────
drop policy if exists "Commanders can update member roles" on public.team_members;
create policy "Commanders can update member roles"
  on public.team_members for update to authenticated
  using (
    public.is_team_commander(team_id, auth.uid())
  )
  with check (
    public.is_team_commander(team_id, auth.uid())
  );

-- ── Fix DELETE policy ───────────────────────────────────────────
drop policy if exists "Commanders can remove members" on public.team_members;
create policy "Commanders can remove members"
  on public.team_members for delete to authenticated
  using (
    public.is_team_commander(team_id, auth.uid())
  );
