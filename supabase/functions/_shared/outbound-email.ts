import type { createServiceClient } from "./client.ts";

type ServiceClient = ReturnType<typeof createServiceClient>;

export type OutboundEmailType =
  | "lead_notification"
  | "property_alert_confirmation"
  | "property_alert_delivery";

export type OutboundEmailRecord = {
  emailType: OutboundEmailType;
  recipientEmail: string;
  sender: string;
  replyToEmail?: string | null;
  subject: string;
  htmlBody: string;
  textBody?: string | null;
  leadId?: string | null;
  propertyAlertSubscriptionId?: string | null;
  propertyAlertDeliveryId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordOutboundEmail(
  supabase: ServiceClient,
  message: OutboundEmailRecord,
): Promise<string> {
  const { data, error } = await supabase
    .from("outbound_email_messages")
    .insert({
      email_type: message.emailType,
      recipient_email: message.recipientEmail,
      sender: message.sender,
      reply_to_email: message.replyToEmail ?? null,
      subject: message.subject,
      html_body: message.htmlBody,
      text_body: message.textBody ?? null,
      status: "pending",
      lead_id: message.leadId ?? null,
      property_alert_subscription_id: message.propertyAlertSubscriptionId ?? null,
      property_alert_delivery_id: message.propertyAlertDeliveryId ?? null,
      metadata: message.metadata ?? {},
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`Outbound email archive insert failed${error?.code ? ` (${error.code})` : ""}.`);
  }

  return data.id as string;
}

export async function markOutboundEmailSent(
  supabase: ServiceClient,
  emailId: string,
  providerMessageId: string | null,
): Promise<void> {
  const { data, error } = await supabase
    .from("outbound_email_messages")
    .update({
      status: "sent",
      provider_message_id: providerMessageId,
      error_message: null,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", emailId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("Could not mark outbound email as sent.", error?.code ?? "record_not_found");
  }
}

export async function markOutboundEmailFailed(
  supabase: ServiceClient,
  emailId: string,
  errorMessage: string,
): Promise<void> {
  const safeMessage = errorMessage
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted email]")
    .slice(0, 1000);
  const { error } = await supabase
    .from("outbound_email_messages")
    .update({
      status: "failed",
      error_message: safeMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", emailId);

  if (error) {
    console.error("Could not mark outbound email as failed.", error.code ?? "unknown_error");
  }
}
