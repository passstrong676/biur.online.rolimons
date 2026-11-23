-- Run this in the Supabase SQL Editor for your project.
create table if not exists public.player_events (
  id bigint generated always as identity primary key,
  user_id text not null,
  player_name text not null,
  game_name text not null default 'biur.online',
  event text not null check (event in ('join', 'leave')),
  created_at timestamptz not null default now()
);

create index if not exists player_events_created_at_idx on public.player_events (created_at desc);

create table if not exists public.player_sessions (
  user_id text primary key,
  player_name text not null,
  game_name text not null default 'biur.online',
  joined_at timestamptz not null default now()
);

-- Keep both tables private: the API reads/writes them using its server-only
-- Supabase service role key. Never expose that key in browser code.
alter table public.player_events enable row level security;
alter table public.player_sessions enable row level security;
