-- ============================================================
-- UEE ATAK APP — Initial Schema
-- Migration: 20260411000000_initial_schema.sql
-- Idempotent: safe to re-run on an existing database
--
-- STRUCTURE:
--   Part 1: Create all tables, types, and triggers
--   Part 2: Enable RLS and create all policies
--   Part 3: Realtime publications and Storage bucket
-- ============================================================

create extension if not exists "uuid-ossp" with schema extensions;

-- ============================================================
-- PART 1: TABLES, TYPES, AND TRIGGERS
-- ============================================================

-- ── Custom Types ─────────────────────────────────────────────

do $$ begin
  create type public.team_role as enum ('commander', 'planner', 'operator');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.marker_affiliation as enum (
    'friendly', 'hostile', 'neutral', 'unknown'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.marker_type as enum (
    'infantry', 'armor', 'air', 'naval', 'artillery',
    'logistics', 'hq', 'recon', 'medical', 'custom'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.drawing_type as enum (
    'line', 'arrow', 'polyline', 'polygon', 'circle', 'rectangle', 'freehand'
  );
exception when duplicate_object then null;
end $$;

-- ── Tables ───────────────────────────────────────────────────

-- 1. PROFILES
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  callsign    text not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Extended user profile linked to auth.users.';

-- 2. TEAMS
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  logo_url    text,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.teams is 'Organizations / Squadrons that users belong to.';

-- 3. TEAM MEMBERS
create table if not exists public.team_members (
  id        uuid primary key default gen_random_uuid(),
  team_id   uuid not null references public.teams(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  role      public.team_role not null default 'operator',
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

comment on table public.team_members is 'RBAC join table: links users to teams with a role.';

-- 4. MAPS
create table if not exists public.maps (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams(id) on delete cascade,
  name         text not null,
  description  text,
  image_path   text not null,
  grid_type    text default 'none',
  grid_size    integer default 50,
  scale_factor real default 1.0,
  canvas_state jsonb,
  created_by   uuid not null references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.maps is 'Tactical map instances tied to a team.';

-- 5. TACTICAL MARKERS
create table if not exists public.tactical_markers (
  id           uuid primary key default gen_random_uuid(),
  map_id       uuid not null references public.maps(id) on delete cascade,
  marker_type  public.marker_type not null default 'infantry',
  affiliation  public.marker_affiliation not null default 'friendly',
  label        text,
  x            real not null,
  y            real not null,
  rotation     real default 0,
  scale        real default 1.0,
  metadata     jsonb default '{}',
  placed_by    uuid not null references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.tactical_markers is 'NATO APP-6C icon placements on tactical maps.';

-- 6. MAP DRAWINGS
create table if not exists public.map_drawings (
  id            uuid primary key default gen_random_uuid(),
  map_id        uuid not null references public.maps(id) on delete cascade,
  drawing_type  public.drawing_type not null default 'line',
  points        jsonb not null default '[]',
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

-- 7. BRIEFINGS
create table if not exists public.briefings (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  map_id     uuid references public.maps(id) on delete set null,
  title      text not null,
  content    text,
  embed_url  text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.briefings is 'Operational briefings and SITREP documents.';

-- ── Functions ─────────────────────────────────────────────────

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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Triggers (drop-then-create for idempotency) ───────────────

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

drop trigger if exists set_maps_updated_at on public.maps;
create trigger set_maps_updated_at
  before update on public.maps
  for each row execute function public.set_updated_at();

drop trigger if exists set_tactical_markers_updated_at on public.tactical_markers;
create trigger set_tactical_markers_updated_at
  before update on public.tactical_markers
  for each row execute function public.set_updated_at();

drop trigger if exists set_map_drawings_updated_at on public.map_drawings;
create trigger set_map_drawings_updated_at
  before update on public.map_drawings
  for each row execute function public.set_updated_at();

drop trigger if exists set_briefings_updated_at on public.briefings;
create trigger set_briefings_updated_at
  before update on public.briefings
  for each row execute function public.set_updated_at();

-- ============================================================
-- PART 2: RLS POLICIES
-- (drop-then-create for idempotency)
-- ============================================================

-- ── Profiles ──────────────────────────────────────────────────

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

-- ── Teams ─────────────────────────────────────────────────────

alter table public.teams enable row level security;

drop policy if exists "Team members can view their team" on public.teams;
create policy "Team members can view their team"
  on public.teams for select to authenticated
  using (
    id in (select team_id from public.team_members where user_id = auth.uid())
  );

drop policy if exists "Commanders can update their team" on public.teams;
create policy "Commanders can update their team"
  on public.teams for update to authenticated
  using (
    id in (select team_id from public.team_members where user_id = auth.uid() and role = 'commander')
  )
  with check (
    id in (select team_id from public.team_members where user_id = auth.uid() and role = 'commander')
  );

drop policy if exists "Authenticated users can create teams" on public.teams;
create policy "Authenticated users can create teams"
  on public.teams for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists "Commanders can delete their team" on public.teams;
create policy "Commanders can delete their team"
  on public.teams for delete to authenticated
  using (
    id in (select team_id from public.team_members where user_id = auth.uid() and role = 'commander')
  );

-- ── Team Members ──────────────────────────────────────────────

alter table public.team_members enable row level security;

drop policy if exists "Members can view team roster" on public.team_members;
create policy "Members can view team roster"
  on public.team_members for select to authenticated
  using (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  );

drop policy if exists "Commanders can add members" on public.team_members;
create policy "Commanders can add members"
  on public.team_members for insert to authenticated
  with check (
    team_id in (select team_id from public.team_members where user_id = auth.uid() and role = 'commander')
    or (user_id = auth.uid() and role = 'commander')
  );

drop policy if exists "Commanders can update member roles" on public.team_members;
create policy "Commanders can update member roles"
  on public.team_members for update to authenticated
  using (
    team_id in (select team_id from public.team_members where user_id = auth.uid() and role = 'commander')
  )
  with check (
    team_id in (select team_id from public.team_members where user_id = auth.uid() and role = 'commander')
  );

drop policy if exists "Commanders can remove members or self-leave" on public.team_members;
create policy "Commanders can remove members or self-leave"
  on public.team_members for delete to authenticated
  using (
    user_id = auth.uid()
    or team_id in (select team_id from public.team_members where user_id = auth.uid() and role = 'commander')
  );

-- ── Maps ──────────────────────────────────────────────────────

alter table public.maps enable row level security;

drop policy if exists "Team members can view maps" on public.maps;
create policy "Team members can view maps"
  on public.maps for select to authenticated
  using (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  );

drop policy if exists "Commanders and planners can create maps" on public.maps;
create policy "Commanders and planners can create maps"
  on public.maps for insert to authenticated
  with check (
    team_id in (select team_id from public.team_members where user_id = auth.uid() and role in ('commander', 'planner'))
  );

drop policy if exists "Commanders and planners can update maps" on public.maps;
create policy "Commanders and planners can update maps"
  on public.maps for update to authenticated
  using (
    team_id in (select team_id from public.team_members where user_id = auth.uid() and role in ('commander', 'planner'))
  )
  with check (
    team_id in (select team_id from public.team_members where user_id = auth.uid() and role in ('commander', 'planner'))
  );

drop policy if exists "Commanders can delete maps" on public.maps;
create policy "Commanders can delete maps"
  on public.maps for delete to authenticated
  using (
    team_id in (select team_id from public.team_members where user_id = auth.uid() and role = 'commander')
  );

-- ── Tactical Markers ──────────────────────────────────────────

alter table public.tactical_markers enable row level security;

drop policy if exists "Team members can view markers" on public.tactical_markers;
create policy "Team members can view markers"
  on public.tactical_markers for select to authenticated
  using (
    map_id in (select id from public.maps where team_id in (select team_id from public.team_members where user_id = auth.uid()))
  );

drop policy if exists "Commanders and planners can create markers" on public.tactical_markers;
create policy "Commanders and planners can create markers"
  on public.tactical_markers for insert to authenticated
  with check (
    map_id in (select id from public.maps where team_id in (select team_id from public.team_members where user_id = auth.uid() and role in ('commander', 'planner')))
  );

drop policy if exists "Commanders and planners can update markers" on public.tactical_markers;
create policy "Commanders and planners can update markers"
  on public.tactical_markers for update to authenticated
  using (
    map_id in (select id from public.maps where team_id in (select team_id from public.team_members where user_id = auth.uid() and role in ('commander', 'planner')))
  )
  with check (
    map_id in (select id from public.maps where team_id in (select team_id from public.team_members where user_id = auth.uid() and role in ('commander', 'planner')))
  );

drop policy if exists "Commanders and planners can delete markers" on public.tactical_markers;
create policy "Commanders and planners can delete markers"
  on public.tactical_markers for delete to authenticated
  using (
    map_id in (select id from public.maps where team_id in (select team_id from public.team_members where user_id = auth.uid() and role in ('commander', 'planner')))
  );

-- ── Map Drawings ──────────────────────────────────────────────

alter table public.map_drawings enable row level security;

drop policy if exists "Team members can view drawings" on public.map_drawings;
create policy "Team members can view drawings"
  on public.map_drawings for select to authenticated
  using (
    map_id in (select id from public.maps where team_id in (select team_id from public.team_members where user_id = auth.uid()))
  );

drop policy if exists "Commanders and planners can create drawings" on public.map_drawings;
create policy "Commanders and planners can create drawings"
  on public.map_drawings for insert to authenticated
  with check (
    map_id in (select id from public.maps where team_id in (select team_id from public.team_members where user_id = auth.uid() and role in ('commander', 'planner')))
  );

drop policy if exists "Commanders and planners can update drawings" on public.map_drawings;
create policy "Commanders and planners can update drawings"
  on public.map_drawings for update to authenticated
  using (
    map_id in (select id from public.maps where team_id in (select team_id from public.team_members where user_id = auth.uid() and role in ('commander', 'planner')))
  )
  with check (
    map_id in (select id from public.maps where team_id in (select team_id from public.team_members where user_id = auth.uid() and role in ('commander', 'planner')))
  );

drop policy if exists "Commanders and planners can delete drawings" on public.map_drawings;
create policy "Commanders and planners can delete drawings"
  on public.map_drawings for delete to authenticated
  using (
    map_id in (select id from public.maps where team_id in (select team_id from public.team_members where user_id = auth.uid() and role in ('commander', 'planner')))
  );

-- ── Briefings ─────────────────────────────────────────────────

alter table public.briefings enable row level security;

drop policy if exists "Team members can view briefings" on public.briefings;
create policy "Team members can view briefings"
  on public.briefings for select to authenticated
  using (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  );

drop policy if exists "Commanders and planners can create briefings" on public.briefings;
create policy "Commanders and planners can create briefings"
  on public.briefings for insert to authenticated
  with check (
    team_id in (select team_id from public.team_members where user_id = auth.uid() and role in ('commander', 'planner'))
  );

drop policy if exists "Commanders and planners can update briefings" on public.briefings;
create policy "Commanders and planners can update briefings"
  on public.briefings for update to authenticated
  using (
    team_id in (select team_id from public.team_members where user_id = auth.uid() and role in ('commander', 'planner'))
  )
  with check (
    team_id in (select team_id from public.team_members where user_id = auth.uid() and role in ('commander', 'planner'))
  );

drop policy if exists "Commanders can delete briefings" on public.briefings;
create policy "Commanders can delete briefings"
  on public.briefings for delete to authenticated
  using (
    team_id in (select team_id from public.team_members where user_id = auth.uid() and role = 'commander')
  );

-- ============================================================
-- PART 3: REALTIME PUBLICATIONS & STORAGE
-- ============================================================

do $$ begin
  alter publication supabase_realtime add table public.tactical_markers;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.map_drawings;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.maps;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.briefings;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.team_members;
exception when duplicate_object then null;
end $$;

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('map-assets', 'map-assets', false)
on conflict (id) do nothing;

-- Storage policies (drop-then-create)
drop policy if exists "Team members can upload map assets" on storage.objects;
create policy "Team members can upload map assets"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'map-assets'
    and (storage.foldername(name))[1] in (
      select id::text from public.teams where id in (
        select team_id from public.team_members where user_id = auth.uid()
      )
    )
  );

drop policy if exists "Team members can view map assets" on storage.objects;
create policy "Team members can view map assets"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'map-assets'
    and (storage.foldername(name))[1] in (
      select id::text from public.teams where id in (
        select team_id from public.team_members where user_id = auth.uid()
      )
    )
  );

drop policy if exists "Commanders can delete map assets" on storage.objects;
create policy "Commanders can delete map assets"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'map-assets'
    and (storage.foldername(name))[1] in (
      select id::text from public.teams where id in (
        select team_id from public.team_members where user_id = auth.uid() and role = 'commander'
      )
    )
  );
