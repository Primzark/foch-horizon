-- Manual override values for homepage market counters dashboard

create table if not exists market_counters (
  id integer primary key check (id = 1),
  sold_count integer not null check (sold_count >= 0),
  under_offer_count integer not null check (under_offer_count >= 0),
  under_contract_count integer not null check (under_contract_count >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table market_counters enable row level security;

drop policy if exists public_read_market_counters on market_counters;
create policy public_read_market_counters on market_counters for select using (true);

drop policy if exists service_role_all_market_counters on market_counters;
create policy service_role_all_market_counters on market_counters for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
