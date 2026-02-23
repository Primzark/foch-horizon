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
  chatbotContext: chatbotContextSchema,
});

export type LeadInputValidated = z.infer<typeof leadInputSchema>;
