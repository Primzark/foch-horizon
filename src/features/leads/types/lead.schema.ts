import { z } from "zod";

export const leadSourceSchema = z.enum(["contact_page", "property_page", "estimation", "favorites_share"]);

export const financingStatusSchema = z.enum(["not_defined", "cash", "mortgage_in_progress", "needs_financing"]);

const chatbotContextSchema = z
  .object({
    sessionId: z.string().trim().min(1).max(120).optional(),
    conversationId: z.string().trim().min(1).max(120).optional(),
    preferences: z.record(z.string(), z.unknown()).optional(),
    qualification: z.record(z.string(), z.unknown()).optional(),
    selectedProperties: z.array(z.number().int().positive()).max(10).optional(),
    planner: z.record(z.string(), z.unknown()).optional(),
    toolSummary: z
      .object({
        actionKinds: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
        requestId: z.string().trim().min(1).max(120).optional(),
        routeCategory: z.string().trim().min(1).max(80).optional(),
        edgeProvider: z.string().trim().min(1).max(80).optional(),
      })
      .partial()
      .optional(),
    multimodalHighlights: z
      .array(
        z.object({
          kind: z.string().trim().min(1).max(80),
          propertyId: z.number().int().positive().optional(),
          title: z.string().trim().min(1).max(200).optional(),
          confidence: z.number().min(0).max(1).optional(),
        }),
      )
      .max(8)
      .optional(),
    sourceMetadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .optional();

export const leadInputSchema = z.object({
  source: leadSourceSchema,
  propertyId: z.number().int().positive().optional(),
  cityId: z.string().trim().min(1).max(120).optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(40).optional(),
  message: z.string().trim().min(8).max(2000),
  consent: z.literal(true),
  website: z.string().trim().max(500).optional(),
  formStartedAt: z.number().int().positive().optional(),
  preferredDates: z.array(z.string()).max(3).optional(),
  callbackWindow: z.string().max(120).optional(),
  financingStatus: financingStatusSchema.optional(),
  chatbotContext: chatbotContextSchema,
});

export type LeadInputValidated = z.infer<typeof leadInputSchema>;

export interface LeadFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
}

export type LeadFormField = keyof LeadFormValues;
export type LeadFormErrors = Partial<Record<LeadFormField, string>>;

export function validateLeadForm(values: LeadFormValues): LeadFormErrors {
  const errors: LeadFormErrors = {};

  if (!values.firstName.trim()) {
    errors.firstName = "Indiquez votre prénom.";
  } else if (values.firstName.trim().length > 80) {
    errors.firstName = "Le prénom doit contenir 80 caractères maximum.";
  }

  if (!values.lastName.trim()) {
    errors.lastName = "Indiquez votre nom.";
  } else if (values.lastName.trim().length > 80) {
    errors.lastName = "Le nom doit contenir 80 caractères maximum.";
  }

  const email = values.email.trim();
  if (!email) {
    errors.email = "Indiquez votre adresse email.";
  } else if (email.length > 254) {
    errors.email = "L’adresse email doit contenir 254 caractères maximum.";
  } else if (!leadInputSchema.shape.email.safeParse(email).success) {
    errors.email = "Vérifiez l’adresse email, par exemple nom@exemple.fr.";
  }

  const phone = values.phone.trim();
  if (phone && phone.length < 7) {
    errors.phone = "Saisissez au moins 7 caractères, ou laissez ce champ vide.";
  } else if (phone.length > 40) {
    errors.phone = "Le téléphone doit contenir 40 caractères maximum.";
  }

  const message = values.message.trim();
  if (!message) {
    errors.message = "Décrivez brièvement votre demande.";
  } else if (message.length < 8) {
    errors.message = "Ajoutez quelques précisions (8 caractères minimum).";
  } else if (message.length > 2000) {
    errors.message = "Le message doit contenir 2 000 caractères maximum.";
  }

  if (!values.consent) {
    errors.consent = "Confirmez l’utilisation de vos données pour traiter cette demande.";
  }

  return errors;
}
