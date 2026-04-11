-- ============================================================
-- Mythra Tactical Command — Initial Schema
-- Migration: 20260411000000_initial_schema.sql
-- 
-- Tables: profiles, teams, team_members, maps, tactical_markers,
--         map_drawings, briefings
-- Features: RBAC (commander/planner/operator), strict RLS,
--           Supabase Realtime publications, Storage bucket
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp" with schema extensions;

-- ============================================================
-- 1. PROFILES (extends Supabase Auth users)
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  callsign    text not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Extended user profile linked to auth.users.';

alter table public.profiles enable row level security;

-- Users can read any profile (for displaying team rosters)
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can only update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Users can insert their own profile (on first login)
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- Auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, callsign)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'callsign', 'OPERATOR-' || left(new.id::text, 6))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. TEAMS (Orgs / Squadrons)
-- ============================================================
create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  logo_url    text,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.teams is 'Organizations / Squadrons that users belong to.';

alter table public.teams enable row level security;

-- Only team members can see their team
create policy "Team members can view their team"
  on public.teams for select
  to authenticated
  using (
    id in (
      select team_id from public.team_members where user_id = auth.uid()
    )
  );

-- Only commanders can update team details
create policy "Commanders can update their team"
  on public.teams for update
  to authenticated
  using (
    id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role = 'commander'
    )
  )
  with check (
    id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role = 'commander'
    )
  );

-- Any authenticated user can create a team (they become commander)
create policy "Authenticated users can create teams"
  on public.teams for insert
  to authenticated
  with check (created_by = auth.uid());

-- Only commanders can delete their team
create policy "Commanders can delete their team"
  on public.teams for delete
  to authenticated
  using (
    id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role = 'commander'
    )
  );

-- ============================================================
-- 3. TEAM MEMBERS (RBAC join table)
--    Roles: 'commander', 'planner', 'operator'
-- ============================================================
create type public.team_role as enum ('commander', 'planner', 'operator');

create table public.team_members (
  id        uuid primary key default gen_random_uuid(),
  team_id   uuid not null references public.teams(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  role      public.team_role not null default 'operator',
  joined_at timestamptz not null default now(),

  unique (team_id, user_id)
);

comment on table public.team_members is 'RBAC join table: links users to teams with a role.';

alter table public.team_members enable row level security;

-- Members can see their own team's roster
create policy "Members can view team roster"
  on public.team_members for select
  to authenticated
  using (
    team_id in (
      select team_id from public.team_members where user_id = auth.uid()
    )
  );

-- Commanders can add members
create policy "Commanders can add members"
  on public.team_members for insert
  to authenticated
  with check (
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role = 'commander'
    )
    -- Allow self-insert when creating a new team (no members yet)
    or (user_id = auth.uid() and role = 'commander')
  );

-- Commanders can update member roles
create policy "Commanders can update member roles"
  on public.team_members for update
  to authenticated
  using (
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role = 'commander'
    )
  )
  with check (
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role = 'commander'
    )
  );

-- Commanders can remove members; members can remove themselves
create policy "Commanders can remove members or self-leave"
  on public.team_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role = 'commander'
    )
  );

-- ============================================================
-- 4. MAPS (Tactical Map assets)
-- ============================================================
create table public.maps (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references public.teams(id) on delete cascade,
  name            text not null,
  description     text,
  image_path      text not null,          -- Supabase Storage path
  grid_type       text default 'none',    -- 'none', 'square', 'hex'
  grid_size       integer default 50,     -- pixels per grid cell
  scale_factor    real default 1.0,       -- meters per grid unit
  canvas_state    jsonb,                  -- serialized Fabric.js canvas
  created_by      uuid not null references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.maps is 'Tactical map instances tied to a team.';

alter table public.maps enable row level security;

-- Team members can view their maps
create policy "Team members can view maps"
  on public.maps for select
  to authenticated
  using (
    team_id in (
      select team_id from public.team_members where user_id = auth.uid()
    )
  );

-- Commanders and planners can create maps
create policy "Commanders and planners can create maps"
  on public.maps for insert
  to authenticated
  with check (
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role in ('commander', 'planner')
    )
  );

-- Commanders and planners can update maps
create policy "Commanders and planners can update maps"
  on public.maps for update
  to authenticated
  using (
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role in ('commander', 'planner')
    )
  )
  with check (
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role in ('commander', 'planner')
    )
  );

-- Only commanders can delete maps
create policy "Commanders can delete maps"
  on public.maps for delete
  to authenticated
  using (
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role = 'commander'
    )
  );

-- ============================================================
-- 5. TACTICAL MARKERS (NATO icon placements)
-- ============================================================
create type public.marker_affiliation as enum (
  'friendly', 'hostile', 'neutral', 'unknown'
);

create type public.marker_type as enum (
  'infantry', 'armor', 'air', 'naval', 'artillery',
  'logistics', 'hq', 'recon', 'medical', 'custom'
);

create table public.tactical_markers (
  id            uuid primary key default gen_random_uuid(),
  map_id        uuid not null references public.maps(id) on delete cascade,
  marker_type   public.marker_type not null default 'infantry',
  affiliation   public.marker_affiliation not null default 'friendly',
  label         text,
  x             real not null,
  y             real not null,
  rotation      real default 0,
  scale         real default 1.0,
  metadata      jsonb default '{}',       -- extra data (unit size, commander, etc.)
  placed_by     uuid not null references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.tactical_markers is 'NATO APP-6C icon placements on tactical maps.';

alter table public.tactical_markers enable row level security;

-- Team members can view markers on their maps
create policy "Team members can view markers"
  on public.tactical_markers for select
  to authenticated
  using (
    map_id in (
      select id from public.maps where team_id in (
        select team_id from public.team_members where user_id = auth.uid()
      )
    )
  );

-- Commanders and planners can create markers
create policy "Commanders and planners can create markers"
  on public.tactical_markers for insert
  to authenticated
  with check (
    map_id in (
      select id from public.maps where team_id in (
        select team_id from public.team_members
        where user_id = auth.uid() and role in ('commander', 'planner')
      )
    )
  );

-- Commanders and planners can update markers
create policy "Commanders and planners can update markers"
  on public.tactical_markers for update
  to authenticated
  using (
    map_id in (
      select id from public.maps where team_id in (
        select team_id from public.team_members
        where user_id = auth.uid() and role in ('commander', 'planner')
      )
    )
  )
  with check (
    map_id in (
      select id from public.maps where team_id in (
        select team_id from public.team_members
        where user_id = auth.uid() and role in ('commander', 'planner')
      )
    )
  );

-- Commanders and planners can delete markers
create policy "Commanders and planners can delete markers"
  on public.tactical_markers for delete
  to authenticated
  using (
    map_id in (
      select id from public.maps where team_id in (
        select team_id from public.team_members
        where user_id = auth.uid() and role in ('commander', 'planner')
      )
    )
  );

-- ============================================================
-- 6. MAP DRAWINGS (lines, shapes, vectors)
-- ============================================================
create type public.drawing_type as enum (
  'line', 'arrow', 'polyline', 'polygon', 'circle', 'rectangle', 'freehand'
);

create table public.map_drawings (
  id            uuid primary key default gen_random_uuid(),
  map_id        uuid not null references public.maps(id) on delete cascade,
  drawing_type  public.drawing_type not null default 'line',
  points        jsonb not null default '[]',  -- array of {x, y} coordinates
  stroke_color  text default '#00ffcc',
  stroke_width  real default 2.0,
  fill_color    text,
  label         text,
  metadata      jsonb default '{}',
  drawn_by      uuid not null references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.map_drawings is 'Vector drawings (lines of advance, perimeters, etc.) on maps.';

alter table public.map_drawings enable row level security;

-- Same RLS pattern as markers: team-scoped
create policy "Team members can view drawings"
  on public.map_drawings for select
  to authenticated
  using (
    map_id in (
      select id from public.maps where team_id in (
        select team_id from public.team_members where user_id = auth.uid()
      )
    )
  );

create policy "Commanders and planners can create drawings"
  on public.map_drawings for insert
  to authenticated
  with check (
    map_id in (
      select id from public.maps where team_id in (
        select team_id from public.team_members
        where user_id = auth.uid() and role in ('commander', 'planner')
      )
    )
  );

create policy "Commanders and planners can update drawings"
  on public.map_drawings for update
  to authenticated
  using (
    map_id in (
      select id from public.maps where team_id in (
        select team_id from public.team_members
        where user_id = auth.uid() and role in ('commander', 'planner')
      )
    )
  )
  with check (
    map_id in (
      select id from public.maps where team_id in (
        select team_id from public.team_members
        where user_id = auth.uid() and role in ('commander', 'planner')
      )
    )
  );

create policy "Commanders and planners can delete drawings"
  on public.map_drawings for delete
  to authenticated
  using (
    map_id in (
      select id from public.maps where team_id in (
        select team_id from public.team_members
        where user_id = auth.uid() and role in ('commander', 'planner')
      )
    )
  );

-- ============================================================
-- 7. BRIEFINGS (operational documents & slideshows)
-- ============================================================
create table public.briefings (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams(id) on delete cascade,
  map_id        uuid references public.maps(id) on delete set null,
  title         text not null,
  content       text,                       -- markdown SITREP content
  embed_url     text,                       -- external doc (Google Slides, etc.)
  created_by    uuid not null references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.briefings is 'Operational briefings and SITREP documents.';

alter table public.briefings enable row level security;

create policy "Team members can view briefings"
  on public.briefings for select
  to authenticated
  using (
    team_id in (
      select team_id from public.team_members where user_id = auth.uid()
    )
  );

create policy "Commanders and planners can create briefings"
  on public.briefings for insert
  to authenticated
  with check (
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role in ('commander', 'planner')
    )
  );

create policy "Commanders and planners can update briefings"
  on public.briefings for update
  to authenticated
  using (
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role in ('commander', 'planner')
    )
  )
  with check (
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role in ('commander', 'planner')
    )
  );

create policy "Commanders can delete briefings"
  on public.briefings for delete
  to authenticated
  using (
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role = 'commander'
    )
  );

-- ============================================================
-- 8. UPDATED_AT TRIGGER (auto-update timestamps)
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_teams_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

create trigger set_maps_updated_at
  before update on public.maps
  for each row execute function public.set_updated_at();

create trigger set_tactical_markers_updated_at
  before update on public.tactical_markers
  for each row execute function public.set_updated_at();

create trigger set_map_drawings_updated_at
  before update on public.map_drawings
  for each row execute function public.set_updated_at();

create trigger set_briefings_updated_at
  before update on public.briefings
  for each row execute function public.set_updated_at();

-- ============================================================
-- 9. REALTIME PUBLICATIONS
--    Enable Supabase Realtime on tables that need live sync
-- ============================================================
alter publication supabase_realtime add table public.tactical_markers;
alter publication supabase_realtime add table public.map_drawings;
alter publication supabase_realtime add table public.maps;
alter publication supabase_realtime add table public.briefings;
alter publication supabase_realtime add table public.team_members;

-- ============================================================
-- 10. STORAGE BUCKET for map images & assets
-- ============================================================
insert into storage.buckets (id, name, public)
values ('map-assets', 'map-assets', false);

-- Only team members can upload to their team's folder
-- Storage path convention: {team_id}/{filename}
create policy "Team members can upload map assets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'map-assets'
    and (storage.foldername(name))[1] in (
      select id::text from public.teams where id in (
        select team_id from public.team_members where user_id = auth.uid()
      )
    )
  );

-- Team members can view their team's assets
create policy "Team members can view map assets"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'map-assets'
    and (storage.foldername(name))[1] in (
      select id::text from public.teams where id in (
        select team_id from public.team_members where user_id = auth.uid()
      )
    )
  );

-- Commanders can delete assets
create policy "Commanders can delete map assets"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'map-assets'
    and (storage.foldername(name))[1] in (
      select id::text from public.teams where id in (
        select team_id from public.team_members
        where user_id = auth.uid() and role = 'commander'
      )
    )
  );
