-- ═══════════════════════════════════════════════════════════════════════════
-- APEXEDGE — Supabase Database Schema
-- Run this entire file in your Supabase SQL Editor (supabase.com → SQL Editor)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── EXTENSIONS ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
-- One row per authenticated user. Auto-populated via trigger on signup.
create table if not exists public.profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  name       text,
  email      text,
  plan       text    default 'free',   -- 'free' | 'pro' | 'enterprise'
  timezone   text    default 'UTC',
  currency   text    default 'USD',
  risk_rules jsonb   default '{
    "maxLotSize": 0.5,
    "dailyLossLimit": 500,
    "maxConcurrentTrades": 5,
    "defaultRiskPct": 1,
    "minRR": 2
  }'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─── TRADES ──────────────────────────────────────────────────────────────────
-- Core trade records. tags stored as text[], notes as text.
create table if not exists public.trades (
  id           text        primary key,          -- e.g. "T1", "M1234567890"
  user_id      uuid        references public.profiles(id) on delete cascade not null,
  pair         text        not null,
  side         text        not null check (side in ('buy','sell')),
  entry_date   timestamptz,
  exit_date    timestamptz,
  entry_price  numeric(20,5),
  exit_price   numeric(20,5),
  lots         numeric(10,3) default 0,
  pnl          numeric(12,2),
  status       text        check (status in ('win','loss','be','open')),
  duration     text,
  rr           numeric(6,2),
  tp           numeric(20,5),
  sl           numeric(20,5),
  notes        text        default '',
  tags         text[]      default '{}',
  source       text        default 'csv',        -- 'csv' | 'mt5' | 'manual'
  broker       text,
  raw_entry_id text,                             -- original order ID from broker
  raw_exit_id  text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists trades_user_id_idx     on public.trades(user_id);
create index if not exists trades_exit_date_idx   on public.trades(exit_date desc);
create index if not exists trades_pair_idx        on public.trades(pair);
create index if not exists trades_status_idx      on public.trades(status);

create trigger trades_updated_at
  before update on public.trades
  for each row execute function public.set_updated_at();

-- ─── IMPORT SESSIONS ─────────────────────────────────────────────────────────
-- Track every CSV / MT5 import so users can see history and rollback.
create table if not exists public.import_sessions (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        references public.profiles(id) on delete cascade not null,
  source      text        not null,   -- 'csv' | 'mt5'
  filename    text,
  broker      text,
  orders_raw  integer     default 0,
  trades_built integer    default 0,
  status      text        default 'complete',
  created_at  timestamptz default now()
);

create index if not exists import_sessions_user_id_idx on public.import_sessions(user_id);

-- ─── API KEYS (encrypted at rest via Supabase Vault - optional) ──────────────
-- Stores hashed references only. Actual keys never stored in plaintext.
create table if not exists public.user_api_keys (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references public.profiles(id) on delete cascade not null,
  provider   text not null,           -- 'anthropic' | 'openai' | 'google'
  key_hint   text,                    -- last 4 chars, e.g. "…abc3"
  created_at timestamptz default now()
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
-- Every table is locked down so users can only access their own data.

alter table public.profiles      enable row level security;
alter table public.trades        enable row level security;
alter table public.import_sessions enable row level security;
alter table public.user_api_keys enable row level security;

-- Profiles: users can read & update only their own row
create policy "profiles: own row read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: own row update" on public.profiles for update using (auth.uid() = id);

-- Trades: full CRUD on own rows only
create policy "trades: own rows select" on public.trades for select using (auth.uid() = user_id);
create policy "trades: own rows insert" on public.trades for insert with check (auth.uid() = user_id);
create policy "trades: own rows update" on public.trades for update using (auth.uid() = user_id);
create policy "trades: own rows delete" on public.trades for delete using (auth.uid() = user_id);

-- Import sessions: own rows only
create policy "imports: own rows" on public.import_sessions for all using (auth.uid() = user_id);

-- API keys: own rows only
create policy "apikeys: own rows" on public.user_api_keys for all using (auth.uid() = user_id);

-- ─── HELPER VIEWS ────────────────────────────────────────────────────────────
-- Quick summary per user (used for dashboard stats).
create or replace view public.trade_summary as
select
  user_id,
  count(*)                                              as total,
  count(*) filter (where status = 'win')               as wins,
  count(*) filter (where status = 'loss')              as losses,
  round(sum(pnl)::numeric, 2)                          as net_pnl,
  round(avg(pnl) filter (where status = 'win')::numeric, 2)  as avg_win,
  round(avg(pnl) filter (where status = 'loss')::numeric, 2) as avg_loss,
  round(
    count(*) filter (where status = 'win')::numeric
    / nullif(count(*) filter (where status in ('win','loss')), 0) * 100
  , 1) as win_rate_pct
from public.trades
where status in ('win','loss','be')
group by user_id;

-- ─── DONE ────────────────────────────────────────────────────────────────────
-- After running this, go to Authentication → Settings in Supabase and:
--   1. Enable "Email" provider
--   2. Set Site URL to http://localhost:5173 (dev) or your production URL
--   3. Add http://localhost:5173 to Redirect URLs
