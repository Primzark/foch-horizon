import { agentById, agents } from "@/features/listings/data/agents";
import { propertyById } from "@/features/listings/data/properties";
import { leadInputSchema } from "@/features/leads/types/lead.schema";
import { apiJson, isEdgeApiEnabled } from "@/lib/api/client";
import type { LeadInput, LeadRecord } from "@/types/domain";

const STORAGE_KEY = "foch_leads";
const apiDelay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

function readLeads(): LeadRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as LeadRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLeads(records: LeadRecord[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function assignAgent(input: LeadInput): string | null {
  if (input.propertyId) {
    const property = propertyById.get(input.propertyId);
    if (property && agentById.has(property.agentId)) {
      return property.agentId;
    }
  }

  if (input.cityId) {
    const matchingAgent = agents.find((agent) => agent.cityIds.includes(input.cityId!));
    if (matchingAgent) {
      return matchingAgent.id;
    }
  }

  return agents[0]?.id ?? null;
}

export async function submitLead(input: LeadInput): Promise<{ ok: true; leadId: string; assignedAgentId: string | null }> {
  const payload = leadInputSchema.parse(input);

  if (isEdgeApiEnabled()) {
    return apiJson<{ ok: true; leadId: string; assignedAgentId: string | null }>("/api/leads", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  await apiDelay();

  const assignedAgentId = assignAgent(payload);

  const record: LeadRecord = {
    ...payload,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    assignedAgentId,
    status: assignedAgentId ? "assigned" : "new",
  };

  const records = readLeads();
  records.unshift(record);
  writeLeads(records);

  return {
    ok: true,
    leadId: record.id,
    assignedAgentId,
  };
}
