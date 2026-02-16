import { z } from "zod";

export const leadSourceSchema = z.enum(["contact_page", "property_page", "estimation", "favorites_share"]);

export const financingStatusSchema = z.enum(["not_defined", "cash", "mortgage_in_progress", "needs_financing"]);

export const leadInputSchema = z.object({
  source: leadSourceSchema,
  propertyId: z.number().int().positive().optional(),
  cityId: z.string().min(1).optional(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).optional(),
  message: z.string().trim().min(8).max(2000),
  consent: z.literal(true),
  preferredDates: z.array(z.string()).max(3).optional(),
  callbackWindow: z.string().max(120).optional(),
  financingStatus: financingStatusSchema.optional(),
});

export type LeadInputValidated = z.infer<typeof leadInputSchema>;
