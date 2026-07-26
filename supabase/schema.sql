-- VinFast Charging Station Manager schema
-- Run this in Supabase SQL Editor

create extension if not exists "pgcrypto";

create table if not exists pillars (
  id uuid primary key default gen_random_uuid(),
  qr_code text not null unique,
  name text not null,
  status text not null default 'active'
    check (status in ('active', 'faulty', 'offline')),
  note text default '',
  created_at timestamptz not null default now()
);

create table if not exists ports (
  id uuid primary key default gen_random_uuid(),
  pillar_id uuid not null references pillars(id) on delete cascade,
  port_number int not null check (port_number between 1 and 4),
  status text not null default 'available'
    check (status in ('available', 'in_use', 'faulty')),
  note text default '',
  unique (pillar_id, port_number)
);

create table if not exists usage_logs (
  id uuid primary key default gen_random_uuid(),
  pillar_id uuid not null references pillars(id) on delete cascade,
  port_id uuid not null references ports(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  note text default ''
);

create index if not exists idx_ports_pillar on ports(pillar_id);
create index if not exists idx_usage_pillar on usage_logs(pillar_id);
create index if not exists idx_usage_started on usage_logs(started_at desc);
create index if not exists idx_usage_open on usage_logs(ended_at) where ended_at is null;

alter table pillars enable row level security;
alter table ports enable row level security;
alter table usage_logs enable row level security;

-- Stage 1: open policies for anon (tighten later with Auth)
create policy "pillars_all" on pillars for all using (true) with check (true);
create policy "ports_all" on ports for all using (true) with check (true);
create policy "usage_logs_all" on usage_logs for all using (true) with check (true);

-- Realtime (optional): enable in Dashboard > Database > Replication
-- or: alter publication supabase_realtime add table pillars, ports, usage_logs;
