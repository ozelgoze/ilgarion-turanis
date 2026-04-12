-- Fix: Allow the team creator to insert themselves as the first member.
-- The previous policy had a circular dependency: to insert into team_members,
-- you needed to already be a commander in team_members.
-- This policy adds a check against teams.created_by so the team creator
-- can bootstrap their own membership.

drop policy if exists "Commanders can add members" on public.team_members;
create policy "Commanders can add members"
  on public.team_members for insert to authenticated
  with check (
    -- Case 1: existing commander adding a member
    team_id in (
      select tm.team_id from public.team_members tm
      where tm.user_id = auth.uid() and tm.role = 'commander'
    )
    -- Case 2: team creator bootstrapping their own commander membership
    or (
      user_id = auth.uid()
      and role = 'commander'
      and team_id in (
        select t.id from public.teams t where t.created_by = auth.uid()
      )
    )
  );
