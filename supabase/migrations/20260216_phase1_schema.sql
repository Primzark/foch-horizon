-- Phase 1 schema for Foch Immobilier rebuild
-- Generated on 2026-02-16

create extension if not exists pgcrypto;

create type transaction_type as enum ('vente', 'location');
create type property_type as enum ('appartement', 'maison_villa', 'autre');
create type property_status as enum ('active', 'under_offer', 'sold', 'rented', 'off_market');
create type lead_source as enum ('contact_page', 'property_page', 'estimation', 'favorites_share');
create type lead_status as enum ('new', 'assigned', 'contacted', 'closed');

create table if not exists cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  postal_codes text[] not null default '{}',
  is_active boolean not null default true,
  hero_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text not null,
  phone text,
  mobile text,
  email text,
  portrait_url text,
  bio text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists properties (
  id integer primary key,
  title text not null,
  slug text not null,
  transaction_type transaction_type not null,
  property_type property_type not null,
  status property_status not null default 'active',
  price_amount integer not null,
  price_currency text not null default 'EUR',
  surface_m2 numeric,
  terrain_m2 numeric,
  rooms integer,
  bedrooms integer,
  bathrooms integer,
  parking_count integer,
  garage_count integer,
  dpe_label text,
  dpe_value numeric,
  ges_label text,
  ges_value numeric,
  description text,
  city_id uuid references cities(id),
  postal_code text,
  lat numeric,
  lng numeric,
  agent_id uuid references agents(id),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (id, slug)
);

create index if not exists idx_properties_city_id on properties(city_id);
create index if not exists idx_properties_transaction on properties(transaction_type);
create index if not exists idx_properties_status on properties(status);
create index if not exists idx_properties_price on properties(price_amount);

create table if not exists property_images (
  id uuid primary key default gen_random_uuid(),
  property_id integer not null references properties(id) on delete cascade,
  source_url text not null,
  sort_order integer not null default 0,
  alt_text text,
  created_at timestamptz not null default now(),
  unique (property_id, source_url)
);

create index if not exists idx_property_images_property_id on property_images(property_id);

create table if not exists property_features (
  property_id integer not null references properties(id) on delete cascade,
  feature_key text not null,
  label_fr text not null,
  primary key (property_id, feature_key)
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source lead_source not null,
  property_id integer references properties(id),
  city_id uuid references cities(id),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  message text not null,
  consent boolean not null default false,
  ip_hash text,
  user_agent text,
  status lead_status not null default 'new',
  assigned_agent_id uuid references agents(id)
);

create index if not exists idx_leads_created_at on leads(created_at desc);
create index if not exists idx_leads_assigned_agent_id on leads(assigned_agent_id);
create index if not exists idx_leads_source on leads(source);

-- Row level security
alter table cities enable row level security;
alter table agents enable row level security;
alter table properties enable row level security;
alter table property_images enable row level security;
alter table property_features enable row level security;
alter table leads enable row level security;

-- Public read access for inventory
create policy if not exists public_read_cities on cities for select using (is_active = true);
create policy if not exists public_read_agents on agents for select using (is_active = true);
create policy if not exists public_read_properties on properties for select using (status <> 'off_market');
create policy if not exists public_read_property_images on property_images for select using (true);
create policy if not exists public_read_property_features on property_features for select using (true);

-- Leads are insert-only for public API, no public reads
create policy if not exists public_insert_leads on leads for insert with check (consent = true);

-- Placeholder admin policy hooks (to be bound with auth roles in project)
create policy if not exists service_role_all_cities on cities for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy if not exists service_role_all_agents on agents for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy if not exists service_role_all_properties on properties for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy if not exists service_role_all_property_images on property_images for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy if not exists service_role_all_property_features on property_features for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy if not exists service_role_all_leads on leads for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
