import { z } from "https://esm.sh/zod@3.25.76";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const payloadSchema = z.object({
  question: z.string().min(2).max(1200),
  chatHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      }),
    )
    .optional(),
});

const systemPrompt = `You are the assistant for Foch Immobilier in Le Havre, France.
Use concise French.
Focus on: properties for sale/rent, neighborhoods (Perret, Saint-Francois, Saint-Vincent, Sanvic, Graville, Eure-Docks), services (vente, location, gestion locative), and real-estate process (offre, compromis, notaire, acte).
If no perfect property match, invite the user to leave email + criteria so agency can follow up.
Do not invent exact legal claims. Keep answers practical.`;

function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Je peux vous aider sur les biens, quartiers et etapes de votre projet immobilier au Havre.";
  }

  const outputText = (payload as { output_text?: string }).output_text;
  if (typeof outputText === "string" && outputText.trim().length > 0) {
    return outputText.trim();
  }

  const output = (payload as { output?: unknown[] }).output;
  if (!Array.isArray(output)) {
    return "Je peux vous aider sur les biens, quartiers et etapes de votre projet immobilier au Havre.";
  }

  const fragments: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown[] }).content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      const text = (block as { text?: string }).text;
      if (typeof text === "string" && text.trim().length > 0) {
        fragments.push(text.trim());
      }
    }
  }

  return fragments.join("\n\n") || "Je peux vous aider sur les biens, quartiers et etapes de votre projet immobilier au Havre.";
}

function buildFallback(question: string) {
  const q = question.toLowerCase();

  if (/compromis|notaire|acte|signature/.test(q)) {
    return {
      answer:
        "Etapes classiques: offre acceptee, verification du financement, signature du compromis, delai legal/conditions suspensives, puis acte authentique chez le notaire. L'agence suit le dossier de bout en bout.",
      suggestedPrompts: [
        "Quel delai entre compromis et acte ?",
        "Quels documents dois-je fournir pour vendre ?",
        "Pouvez-vous m'accompagner sur le financement ?",
      ],
    };
  }

  if (/service|gestion|location|vente|estimation/.test(q)) {
    return {
      answer:
        "Foch Immobilier accompagne la vente, l'achat, la location et la gestion locative au Havre. Vous pouvez aussi demander une estimation argumentee de votre bien.",
      suggestedPrompts: [
        "Je veux une estimation de mon appartement",
        "Quels services de gestion locative proposez-vous ?",
        "Je cherche un bien a acheter au Havre",
      ],
    };
  }

  return {
    answer:
      "Je peux vous aider sur les biens disponibles, les quartiers du Havre et les etapes de vente/achat. Si vous ne trouvez pas le bon bien, laissez votre email et vos criteres pour un rappel agence.",
    suggestedPrompts: [
      "Je cherche un appartement a vendre quartier Perret",
      "Quel quartier viser pour un investissement locatif ?",
      "Comment se passe un compromis de vente ?",
    ],
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const rawPayload = await request.json();
    const payload = payloadSchema.parse(rawPayload);

    const apiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
    const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1-mini";

    if (!apiKey) {
      return jsonResponse({ source: "fallback", ...buildFallback(payload.question) });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_output_tokens: 420,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt }],
          },
          ...(payload.chatHistory ?? []).slice(-6).map((message) => ({
            role: message.role,
            content: [{ type: "input_text", text: message.content }],
          })),
          {
            role: "user",
            content: [{ type: "input_text", text: payload.question }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const fallback = buildFallback(payload.question);
      return jsonResponse({ source: "fallback", ...fallback });
    }

    const data = await response.json();
    const answer = extractOutputText(data);

    return jsonResponse({
      source: "openai",
      answer,
      suggestedPrompts: [
        "Pouvez-vous proposer des biens similaires ?",
        "Je souhaite une estimation de mon bien",
        "Je ne trouve pas de bien, je veux laisser mon email",
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return jsonResponse({ ok: false, error: message }, 400);
  }
});
