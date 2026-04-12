-- Add label_size column to tactical_markers (default 14 = Medium)
alter table public.tactical_markers
  add column if not exists label_size smallint not null default 14;
