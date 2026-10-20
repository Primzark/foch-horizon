create extension if not exists unaccent with schema extensions;

create table public.property_alert_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) <= 254),
  criteria jsonb not null check (jsonb_typeof(criteria) = 'object'),
  criteria_hash text not null check (criteria_hash ~ '^[0-9a-f]{64}$'),
  consent_at timestamptz not null,
  confirmation_expires_at timestamptz not null,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  confirmation_email_status text not null default 'pending'
    check (confirmation_email_status in ('pending', 'sending', 'sent', 'failed')),
  confirmation_email_attempts integer not null default 0 check (confirmation_email_attempts >= 0),
  confirmation_email_next_attempt_at timestamptz not null default now(),
  confirmation_email_last_error text,
  confirmation_email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index property_alert_subscriptions_active_email_criteria_idx
  on public.property_alert_subscriptions (email, criteria_hash)
  where unsubscribed_at is null;
create index property_alert_subscriptions_confirmation_queue_idx
  on public.property_alert_subscriptions (confirmation_email_next_attempt_at, created_at)
  where confirmed_at is null and unsubscribed_at is null;

create table public.property_alert_publications (
  id uuid primary key default gen_random_uuid(),
  property_id integer not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index property_alert_publications_queue_idx
  on public.property_alert_publications (created_at)
  where processed_at is null;

create table public.property_alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.property_alert_subscriptions(id) on delete cascade,
  property_id integer not null references public.properties(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscription_id, property_id)
);
create index property_alert_deliveries_retry_idx
  on public.property_alert_deliveries (next_attempt_at, created_at)
  where status in ('pending', 'failed', 'processing');

alter table public.property_alert_subscriptions enable row level security;
alter table public.property_alert_publications enable row level security;
alter table public.property_alert_deliveries enable row level security;

revoke all on public.property_alert_subscriptions from public, anon, authenticated;
revoke all on public.property_alert_publications from public, anon, authenticated;
revoke all on public.property_alert_deliveries from public, anon, authenticated;
grant select, insert, update, delete on public.property_alert_subscriptions to service_role;
grant select, insert, update, delete on public.property_alert_publications to service_role;
grant select, insert, update, delete on public.property_alert_deliveries to service_role;

create or replace function public.normalize_property_alert_text(p_value text)
returns text
language sql
stable
strict
set search_path = pg_catalog, extensions
as $$
  select lower(extensions.unaccent(p_value));
$$;

create or replace function public.upsert_property_alert_subscription(
  p_email text,
  p_criteria jsonb,
  p_criteria_hash text,
  p_consent_at timestamptz,
  p_confirmation_expires_at timestamptz
)
returns table (subscription_id uuid, already_confirmed boolean, confirmation_expires_at timestamptz)
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
declare
  saved_subscription record;
begin
  if p_criteria is null or jsonb_typeof(p_criteria) <> 'object'
    or p_email is null or length(trim(p_email)) = 0 or length(p_email) > 254
    or p_criteria_hash is null or p_criteria_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid property alert subscription.' using errcode = '22023';
  end if;

  insert into public.property_alert_subscriptions as current_subscription (
    email,
    criteria,
    criteria_hash,
    consent_at,
    confirmation_expires_at
  ) values (
    lower(trim(p_email)),
    p_criteria,
    p_criteria_hash,
    coalesce(p_consent_at, now()),
    coalesce(p_confirmation_expires_at, now() + interval '48 hours')
  )
  on conflict (email, criteria_hash) where unsubscribed_at is null
  do update set
    criteria = excluded.criteria,
    consent_at = case
      when current_subscription.confirmed_at is null then excluded.consent_at
      else current_subscription.consent_at
    end,
    confirmation_email_status = case
      when current_subscription.confirmed_at is null
        and current_subscription.confirmation_expires_at <= now() then 'pending'
      else current_subscription.confirmation_email_status
    end,
    confirmation_email_attempts = case
      when current_subscription.confirmed_at is null
        and current_subscription.confirmation_expires_at <= now() then 0
      else current_subscription.confirmation_email_attempts
    end,
    confirmation_email_next_attempt_at = case
      when current_subscription.confirmed_at is null
        and current_subscription.confirmation_expires_at <= now() then now()
      else current_subscription.confirmation_email_next_attempt_at
    end,
    confirmation_email_last_error = case
      when current_subscription.confirmed_at is null
        and current_subscription.confirmation_expires_at <= now() then null
      else current_subscription.confirmation_email_last_error
    end,
    confirmation_email_sent_at = case
      when current_subscription.confirmed_at is null
        and current_subscription.confirmation_expires_at <= now() then null
      else current_subscription.confirmation_email_sent_at
    end,
    confirmation_expires_at = case
      when current_subscription.confirmed_at is null
        and current_subscription.confirmation_expires_at <= now() then excluded.confirmation_expires_at
      else current_subscription.confirmation_expires_at
    end,
    updated_at = now()
  returning
    current_subscription.id as id,
    (current_subscription.confirmed_at is not null and current_subscription.unsubscribed_at is null) as is_confirmed,
    current_subscription.confirmation_expires_at as expires_at
  into saved_subscription;

  return query select saved_subscription.id, saved_subscription.is_confirmed, saved_subscription.expires_at;
end;
$$;

create or replace function public.confirm_property_alert_subscription(p_subscription_id uuid)
returns boolean
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  update public.property_alert_subscriptions
  set confirmed_at = coalesce(confirmed_at, now()),
      updated_at = now()
  where id = p_subscription_id
    and unsubscribed_at is null
    and (confirmed_at is not null or confirmation_expires_at > now());

  return found;
end;
$$;

create or replace function public.unsubscribe_property_alert_subscription(p_subscription_id uuid)
returns boolean
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  update public.property_alert_subscriptions
  set unsubscribed_at = coalesce(unsubscribed_at, now()),
      updated_at = now()
  where id = p_subscription_id;

  if not found then
    return false;
  end if;

  update public.property_alert_deliveries
  set status = 'cancelled',
      updated_at = now(),
      last_error = null
  where subscription_id = p_subscription_id
    and status in ('pending', 'failed');

  return true;
end;
$$;

create or replace function public.enqueue_property_publication()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'active' then
      insert into public.property_alert_publications (property_id) values (new.id);
    end if;
  elsif new.status = 'active' and old.status is distinct from 'active' then
    insert into public.property_alert_publications (property_id) values (new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists property_alert_publication_created on public.properties;
create trigger property_alert_publication_created
  after insert or update on public.properties
  for each row
  execute function public.enqueue_property_publication();

create or replace function public.enqueue_property_alert_deliveries(p_limit integer default 100)
returns integer
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
declare
  publication_row public.property_alert_publications%rowtype;
  inserted_count integer := 0;
  batch_count integer := 0;
begin
  for publication_row in
    select publications.*
    from public.property_alert_publications as publications
    where publications.processed_at is null
    order by publications.created_at, publications.id
    limit greatest(1, least(coalesce(p_limit, 100), 500))
    for update skip locked
  loop
    insert into public.property_alert_deliveries (subscription_id, property_id)
    select subscriptions.id, properties.id
    from public.property_alert_subscriptions as subscriptions
    join public.properties as properties on properties.id = publication_row.property_id
    left join public.cities as cities on cities.id = properties.city_id
    where subscriptions.confirmed_at is not null
      and subscriptions.confirmed_at < publication_row.created_at
      and subscriptions.unsubscribed_at is null
      and properties.status = 'active'
      and (subscriptions.criteria->>'transaction' is null
        or subscriptions.criteria->>'transaction' = properties.transaction_type::text)
      and (subscriptions.criteria->>'type' is null
        or subscriptions.criteria->>'type' = properties.property_type::text)
      and (subscriptions.criteria->>'city' is null or (
        public.normalize_property_alert_text(coalesce(cities.slug, '')) = public.normalize_property_alert_text(subscriptions.criteria->>'city')
        or position(
          public.normalize_property_alert_text(subscriptions.criteria->>'city')
          in public.normalize_property_alert_text(coalesce(cities.name, ''))
        ) > 0
        or exists (
          select 1
          from unnest(coalesce(cities.postal_codes, array[]::text[])) as postal_code
          where position(
            public.normalize_property_alert_text(subscriptions.criteria->>'city')
            in public.normalize_property_alert_text(postal_code)
          ) > 0
        )
      ))
      and (subscriptions.criteria->>'q' is null or (
        position(public.normalize_property_alert_text(subscriptions.criteria->>'q') in public.normalize_property_alert_text(properties.title)) > 0
        or position(public.normalize_property_alert_text(subscriptions.criteria->>'q') in public.normalize_property_alert_text(coalesce(properties.description, ''))) > 0
        or position(public.normalize_property_alert_text(subscriptions.criteria->>'q') in public.normalize_property_alert_text(properties.slug)) > 0
        or position(public.normalize_property_alert_text(subscriptions.criteria->>'q') in public.normalize_property_alert_text(coalesce(cities.name, ''))) > 0
        or position(public.normalize_property_alert_text(subscriptions.criteria->>'q') in properties.id::text) > 0
      ))
      and (subscriptions.criteria->>'bedroomsMin' is null
        or coalesce(properties.bedrooms, 0) >= (subscriptions.criteria->>'bedroomsMin')::numeric)
      and (subscriptions.criteria->>'bathroomsMin' is null
        or coalesce(properties.bathrooms, 0) >= (subscriptions.criteria->>'bathroomsMin')::numeric)
      and (subscriptions.criteria->>'garagesMin' is null
        or coalesce(properties.garage_count, 0) >= (subscriptions.criteria->>'garagesMin')::numeric)
      and (subscriptions.criteria->>'priceMin' is null
        or properties.price_amount >= (subscriptions.criteria->>'priceMin')::numeric)
      and (subscriptions.criteria->>'priceMax' is null
        or properties.price_amount <= (subscriptions.criteria->>'priceMax')::numeric)
      and (subscriptions.criteria->>'surfaceMin' is null
        or coalesce(properties.surface_m2, 0) >= (subscriptions.criteria->>'surfaceMin')::numeric)
      and (subscriptions.criteria->>'surfaceMax' is null
        or coalesce(properties.surface_m2, 0) <= (subscriptions.criteria->>'surfaceMax')::numeric)
      and (subscriptions.criteria->>'terrainMin' is null
        or coalesce(properties.terrain_m2, 0) >= (subscriptions.criteria->>'terrainMin')::numeric)
      and (subscriptions.criteria->>'terrainMax' is null
        or coalesce(properties.terrain_m2, 0) <= (subscriptions.criteria->>'terrainMax')::numeric)
      and not exists (
        select 1
        from jsonb_array_elements_text(coalesce(subscriptions.criteria->'features', '[]'::jsonb)) as requested_feature
        where not exists (
          select 1
          from public.property_features as property_feature
          where property_feature.property_id = properties.id
            and position(
              public.normalize_property_alert_text(requested_feature)
              in public.normalize_property_alert_text(property_feature.feature_key)
            ) > 0
        )
      )
    on conflict (subscription_id, property_id) do nothing;

    get diagnostics batch_count = row_count;
    inserted_count := inserted_count + batch_count;

    update public.property_alert_publications
    set processed_at = now()
    where id = publication_row.id;
  end loop;

  return inserted_count;
end;
$$;

create or replace function public.claim_property_alert_confirmations(
  p_limit integer default 20,
  p_subscription_id uuid default null
)
returns table (subscription_id uuid, email text, confirmation_expires_at timestamptz, attempts integer)
language sql
set search_path = pg_catalog, public, pg_temp
as $$
  with selected as (
    select subscriptions.id
    from public.property_alert_subscriptions as subscriptions
    where subscriptions.confirmed_at is null
      and subscriptions.unsubscribed_at is null
      and subscriptions.confirmation_expires_at > now()
      and (subscriptions.id = p_subscription_id or p_subscription_id is null)
      and (
        (subscriptions.confirmation_email_status in ('pending', 'failed')
          and subscriptions.confirmation_email_next_attempt_at <= now())
        or (subscriptions.confirmation_email_status = 'sending'
          and subscriptions.updated_at < now() - interval '15 minutes')
      )
    order by subscriptions.created_at
    limit greatest(1, least(coalesce(p_limit, 20), 100))
    for update skip locked
  ), claimed as (
    update public.property_alert_subscriptions as subscriptions
    set confirmation_email_status = 'sending',
        confirmation_email_attempts = subscriptions.confirmation_email_attempts + 1,
        updated_at = now()
    from selected
    where subscriptions.id = selected.id
    returning subscriptions.id, subscriptions.email, subscriptions.confirmation_expires_at,
      subscriptions.confirmation_email_attempts
  )
  select claimed.id, claimed.email, claimed.confirmation_expires_at, claimed.confirmation_email_attempts
  from claimed;
$$;

create or replace function public.complete_property_alert_confirmation(
  p_subscription_id uuid,
  p_sent boolean,
  p_error text default null
)
returns boolean
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  update public.property_alert_subscriptions
  set confirmation_email_status = case when p_sent then 'sent' else 'failed' end,
      confirmation_email_sent_at = case when p_sent then now() else confirmation_email_sent_at end,
      confirmation_email_last_error = case when p_sent then null else left(coalesce(p_error, 'Email provider error'), 500) end,
      confirmation_email_next_attempt_at = case
        when p_sent then confirmation_email_next_attempt_at
        else now() + make_interval(secs => least(86400, 60 * power(2, least(confirmation_email_attempts - 1, 10))::integer))
      end,
      updated_at = now()
  where id = p_subscription_id
    and confirmation_email_status = 'sending';

  return found;
end;
$$;

create or replace function public.claim_property_alert_deliveries(p_limit integer default 50)
returns table (delivery_id uuid, subscription_id uuid, property_id integer, attempts integer)
language sql
set search_path = pg_catalog, public, pg_temp
as $$
  with selected as (
    select deliveries.id
    from public.property_alert_deliveries as deliveries
    join public.property_alert_subscriptions as subscriptions on subscriptions.id = deliveries.subscription_id
    where subscriptions.confirmed_at is not null
      and subscriptions.unsubscribed_at is null
      and (
        (deliveries.status in ('pending', 'failed') and deliveries.next_attempt_at <= now())
        or (deliveries.status = 'processing' and deliveries.updated_at < now() - interval '15 minutes')
      )
    order by deliveries.created_at
    limit greatest(1, least(coalesce(p_limit, 50), 200))
    for update of deliveries skip locked
  ), claimed as (
    update public.property_alert_deliveries as deliveries
    set status = 'processing',
        attempts = deliveries.attempts + 1,
        updated_at = now()
    from selected
    where deliveries.id = selected.id
    returning deliveries.id, deliveries.subscription_id, deliveries.property_id, deliveries.attempts
  )
  select claimed.id, claimed.subscription_id, claimed.property_id, claimed.attempts
  from claimed;
$$;

create or replace function public.complete_property_alert_delivery(
  p_delivery_id uuid,
  p_result text,
  p_error text default null
)
returns boolean
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if p_result is null or p_result not in ('sent', 'failed', 'cancelled') then
    raise exception 'Invalid property alert delivery result.' using errcode = '22023';
  end if;

  update public.property_alert_deliveries
  set status = p_result,
      sent_at = case when p_result = 'sent' then now() else sent_at end,
      last_error = case when p_result = 'failed' then left(coalesce(p_error, 'Email provider error'), 500) else null end,
      next_attempt_at = case
        when p_result <> 'failed' then next_attempt_at
        else now() + make_interval(secs => least(86400, 60 * power(2, least(attempts - 1, 10))::integer))
      end,
      updated_at = now()
  where id = p_delivery_id
    and status = 'processing';

  return found;
end;
$$;

revoke all on function public.normalize_property_alert_text(text) from public, anon, authenticated;
revoke all on function public.upsert_property_alert_subscription(text, jsonb, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.confirm_property_alert_subscription(uuid) from public, anon, authenticated;
revoke all on function public.unsubscribe_property_alert_subscription(uuid) from public, anon, authenticated;
revoke all on function public.enqueue_property_publication() from public, anon, authenticated;
revoke all on function public.enqueue_property_alert_deliveries(integer) from public, anon, authenticated;
revoke all on function public.claim_property_alert_confirmations(integer, uuid) from public, anon, authenticated;
revoke all on function public.complete_property_alert_confirmation(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.claim_property_alert_deliveries(integer) from public, anon, authenticated;
revoke all on function public.complete_property_alert_delivery(uuid, text, text) from public, anon, authenticated;
grant execute on function public.normalize_property_alert_text(text) to service_role;
grant execute on function public.upsert_property_alert_subscription(text, jsonb, text, timestamptz, timestamptz) to service_role;
grant execute on function public.confirm_property_alert_subscription(uuid) to service_role;
grant execute on function public.unsubscribe_property_alert_subscription(uuid) to service_role;
grant execute on function public.enqueue_property_publication() to service_role;
grant execute on function public.enqueue_property_alert_deliveries(integer) to service_role;
grant execute on function public.claim_property_alert_confirmations(integer, uuid) to service_role;
grant execute on function public.complete_property_alert_confirmation(uuid, boolean, text) to service_role;
grant execute on function public.claim_property_alert_deliveries(integer) to service_role;
grant execute on function public.complete_property_alert_delivery(uuid, text, text) to service_role;
