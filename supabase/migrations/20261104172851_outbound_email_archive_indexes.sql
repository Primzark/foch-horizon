create index outbound_email_messages_subscription_id_idx
  on public.outbound_email_messages (property_alert_subscription_id)
  where property_alert_subscription_id is not null;

create index outbound_email_messages_delivery_id_idx
  on public.outbound_email_messages (property_alert_delivery_id)
  where property_alert_delivery_id is not null;
