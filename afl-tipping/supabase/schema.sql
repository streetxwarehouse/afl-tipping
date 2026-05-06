-- Run this in the Supabase SQL editor

create table entries (
  id            uuid        primary key default gen_random_uuid(),
  season        int         not null,
  round_number  int         not null,
  email         text        not null,
  tips          jsonb       not null,  -- { "gameId": teamId, ... }
  score         int,                   -- null until round is processed
  discount_code text,
  klaviyo_sent  boolean     not null default false,
  submitted_at  timestamptz not null default now()
);

-- Enforce one entry per email per round (case-insensitive)
create unique index entries_one_per_round
  on entries (season, round_number, lower(email));

create index entries_round_idx
  on entries (season, round_number);

-- Enable Row Level Security (no public access — only service key can write)
alter table entries enable row level security;
