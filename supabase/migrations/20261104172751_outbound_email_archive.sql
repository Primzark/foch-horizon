create table public.outbound_email_messages (
  id uuid primary key default gen_random_uuid(),
  email_type text not null check (email_type in (
    'lead_notification',
    'property_alert_confirmation',
    'property_alert_delivery'
  )),
  recipient_email text not null check (char_length(recipient_email) <= 254),
  sender text not null check (char_length(sender) <= 320),
  reply_to_email text check (reply_to_email is null or char_length(reply_to_email) <= 254),
  subject text not null,
  html_body text not null,
  text_body text,
  provider text not null default 'resend',
  provider_message_id text,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  error_message text,
  lead_id uuid references public.leads(id) on delete set null,
  property_alert_subscription_id uuid references public.property_alert_subscriptions(id) on delete set null,
  property_alert_delivery_id uuid references public.property_alert_deliveries(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create index outbound_email_messages_created_at_idx
  on public.outbound_email_messages (created_at desc);
create index outbound_email_messages_recipient_created_at_idx
  on public.outbound_email_messages (recipient_email, created_at desc);
create index outbound_email_messages_status_created_at_idx
  on public.outbound_email_messages (status, created_at desc);
create index outbound_email_messages_lead_id_idx
  on public.outbound_email_messages (lead_id)
  where lead_id is not null;
create index outbound_email_messages_provider_id_idx
  on public.outbound_email_messages (provider, provider_message_id)
  where provider_message_id is not null;

alter table public.outbound_email_messages enable row level security;
revoke all on public.outbound_email_messages from public, anon, authenticated;
grant select, insert, update on public.outbound_email_messages to service_role;

create policy service_role_read_outbound_email_messages
  on public.outbound_email_messages for select to service_role using (true);
create policy service_role_insert_outbound_email_messages
  on public.outbound_email_messages for insert to service_role with check (true);
create policy service_role_update_outbound_email_messages
  on public.outbound_email_messages for update to service_role using (true) with check (true);
