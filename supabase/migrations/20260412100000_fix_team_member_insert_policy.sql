-- ============================================================
-- FIX: RLS policy recursion and INSERT→SELECT flow issues
-- ============================================================
-- Problems solved:
--   1. team_members policies referenced team_members → infinite recursion
--   2. teams SELECT policy blocked INSERT...RETURNING for team creators
--      (creator isn't a member yet at INSERT time)
--   3. Verbose role-check subqueries repeated across many policies
--
-- Solution: security-definer helper functions that bypass RLS,
-- plus creator fallback on teams SELECT.
-- ============================================================

-- ── Helper functions (security definer = bypass RLS) ─────────

create or replace function public.is_team_member(p_team_id uuid, p_user_id uuid)
returns boolean
language sql security definer set search_path = '' stable
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = p_user_id
  );
$$;

create or replace function public.is_team_commander(p_team_id uuid, p_user_id uuid)
returns boolean
language sql security definer set search_path = '' stable
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = p_user_id and role = 'commander'
  );
$$;

create or replace function public.is_team_editor(p_team_id uuid, p_user_id uuid)
returns boolean
language sql security definer set search_path = '' stable
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = p_user_id
      and role in ('commander', 'planner')
  );
$$;

-- Helper: given a map_id, get the team_id (bypasses RLS on maps)
create or replace function public.map_team_id(p_map_id uuid)
returns uuid
language sql security definer set search_path = '' stable
as $$
  select team_id from public.maps where id = p_map_id;
$$;

-- ============================================================
-- TEAMS
-- ============================================================

drop policy if exists "Team members can view their team" on public.teams;
create policy "Team members can view their team"
  on public.teams for select to authenticated
  using (
    public.is_team_member(id, auth.uid())
    or created_by = auth.uid()  -- lets creator SELECT right after INSERT
  );

-- UPDATE / DELETE are fine (user is already a member by then),
-- but switch to helpers for consistency
drop policy if exists "Commanders can update their team" on public.teams;
create policy "Commanders can update their team"
  on public.teams for update to authenticated
  using  (public.is_team_commander(id, auth.uid()))
  with check (public.is_team_commander(id, auth.uid()));

-- INSERT stays the same (no subquery needed)
-- drop + recreate for idempotency
drop policy if exists "Authenticated users can create teams" on public.teams;
create policy "Authenticated users can create teams"
  on public.teams for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists "Commanders can delete their team" on public.teams;
create policy "Commanders can delete their team"
  on public.teams for delete to authenticated
  using (public.is_team_commander(id, auth.uid()));

-- ============================================================
-- TEAM MEMBERS
-- ============================================================

drop policy if exists "Members can view team roster" on public.team_members;
create policy "Members can view team roster"
  on public.team_members for select to authenticated
  using (public.is_team_member(team_id, auth.uid()));

drop policy if exists "Commanders can add members" on public.team_members;
create policy "Commanders can add members"
  on public.team_members for insert to authenticated
  with check (
    public.is_team_commander(team_id, auth.uid())
    or (
      -- Bootstrap: team creator inserting themselves as first commander
      user_id = auth.uid()
      and role = 'commander'
      and team_id in (select t.id from public.teams t where t.created_by = auth.uid())
    )
  );

drop policy if exists "Commanders can update member roles" on public.team_members;
create policy "Commanders can update member roles"
  on public.team_members for update to authenticated
  using  (public.is_team_commander(team_id, auth.uid()))
  with check (public.is_team_commander(team_id, auth.uid()));

drop policy if exists "Commanders can remove members" on public.team_members;
drop policy if exists "Commanders can remove members or self-leave" on public.team_members;
create policy "Commanders can remove members"
  on public.team_members for delete to authenticated
  using (
    user_id = auth.uid()  -- members can leave
    or public.is_team_commander(team_id, auth.uid())
  );

-- ============================================================
-- MAPS
-- ============================================================

drop policy if exists "Team members can view maps" on public.maps;
create policy "Team members can view maps"
  on public.maps for select to authenticated
  using (public.is_team_member(team_id, auth.uid()));

drop policy if exists "Commanders and planners can create maps" on public.maps;
create policy "Commanders and planners can create maps"
  on public.maps for insert to authenticated
  with check (public.is_team_editor(team_id, auth.uid()));

drop policy if exists "Commanders and planners can update maps" on public.maps;
create policy "Commanders and planners can update maps"
  on public.maps for update to authenticated
  using  (public.is_team_editor(team_id, auth.uid()))
  with check (public.is_team_editor(team_id, auth.uid()));

drop policy if exists "Commanders can delete maps" on public.maps;
create policy "Commanders can delete maps"
  on public.maps for delete to authenticated
  using (public.is_team_commander(team_id, auth.uid()));

-- ============================================================
-- TACTICAL MARKERS
-- ============================================================

drop policy if exists "Team members can view markers" on public.tactical_markers;
create policy "Team members can view markers"
  on public.tactical_markers for select to authenticated
  using (public.is_team_member(public.map_team_id(map_id), auth.uid()));

drop policy if exists "Commanders and planners can create markers" on public.tactical_markers;
create policy "Commanders and planners can create markers"
  on public.tactical_markers for insert to authenticated
  with check (public.is_team_editor(public.map_team_id(map_id), auth.uid()));

drop policy if exists "Commanders and planners can update markers" on public.tactical_markers;
create policy "Commanders and planners can update markers"
  on public.tactical_markers for update to authenticated
  using  (public.is_team_editor(public.map_team_id(map_id), auth.uid()))
  with check (public.is_team_editor(public.map_team_id(map_id), auth.uid()));

drop policy if exists "Commanders and planners can delete markers" on public.tactical_markers;
create policy "Commanders and planners can delete markers"
  on public.tactical_markers for delete to authenticated
  using (public.is_team_editor(public.map_team_id(map_id), auth.uid()));

-- ============================================================
-- MAP DRAWINGS
-- ============================================================

drop policy if exists "Team members can view drawings" on public.map_drawings;
create policy "Team members can view drawings"
  on public.map_drawings for select to authenticated
  using (public.is_team_member(public.map_team_id(map_id), auth.uid()));

drop policy if exists "Commanders and planners can create drawings" on public.map_drawings;
create policy "Commanders and planners can create drawings"
  on public.map_drawings for insert to authenticated
  with check (public.is_team_editor(public.map_team_id(map_id), auth.uid()));

drop policy if exists "Commanders and planners can update drawings" on public.map_drawings;
create policy "Commanders and planners can update drawings"
  on public.map_drawings for update to authenticated
  using  (public.is_team_editor(public.map_team_id(map_id), auth.uid()))
  with check (public.is_team_editor(public.map_team_id(map_id), auth.uid()));

drop policy if exists "Commanders and planners can delete drawings" on public.map_drawings;
create policy "Commanders and planners can delete drawings"
  on public.map_drawings for delete to authenticated
  using (public.is_team_editor(public.map_team_id(map_id), auth.uid()));

-- ============================================================
-- BRIEFINGS
-- ============================================================

drop policy if exists "Team members can view briefings" on public.briefings;
create policy "Team members can view briefings"
  on public.briefings for select to authenticated
  using (public.is_team_member(team_id, auth.uid()));

drop policy if exists "Commanders and planners can create briefings" on public.briefings;
create policy "Commanders and planners can create briefings"
  on public.briefings for insert to authenticated
  with check (public.is_team_editor(team_id, auth.uid()));

drop policy if exists "Commanders and planners can update briefings" on public.briefings;
create policy "Commanders and planners can update briefings"
  on public.briefings for update to authenticated
  using  (public.is_team_editor(team_id, auth.uid()))
  with check (public.is_team_editor(team_id, auth.uid()));

drop policy if exists "Commanders can delete briefings" on public.briefings;
create policy "Commanders can delete briefings"
  on public.briefings for delete to authenticated
  using (public.is_team_commander(team_id, auth.uid()));
