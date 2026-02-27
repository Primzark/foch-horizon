const baseUrl = (process.env.EDGE_LOCAL_BASE_URL ?? "http://127.0.0.1:54321/functions/v1").replace(/\/$/, "");
const timeoutMs = Number.parseInt(process.env.EDGE_LOCAL_TIMEOUT_MS ?? "12000", 10);
const runChatbotSmoke = process.env.SMOKE_CHATBOT === "true";

async function requestJson(path, init) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 12000);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`${path} returned HTTP ${response.status}: ${text.slice(0, 500)}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function ensureAggregateContract(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Aggregate payload is not an object.");
  }
  if (payload.ok !== true) {
    throw new Error(`Aggregate payload has ok=${String(payload.ok)}.`);
  }
  const metrics = payload.metrics;
  if (!metrics || typeof metrics !== "object") {
    throw new Error("Aggregate payload missing metrics.");
  }
  const numericKeys = [
    "count",
    "avgSurfaceM2",
    "medianSurfaceM2",
    "minSurfaceM2",
    "maxSurfaceM2",
    "avgPrice",
    "medianPrice",
    "minPrice",
    "maxPrice",
    "avgPricePerM2",
  ];
  for (const key of numericKeys) {
    const value = metrics[key];
    if (!(value == null || typeof value === "number")) {
      throw new Error(`metrics.${key} must be number|null, got ${typeof value}`);
    }
  }

  const breakdowns = payload.breakdowns;
  if (!breakdowns || typeof breakdowns !== "object") {
    throw new Error("Aggregate payload missing breakdowns.");
  }
  for (const key of ["byTransaction", "byType", "topCities"]) {
    const value = breakdowns[key];
    if (!Array.isArray(value)) {
      throw new Error(`breakdowns.${key} must be an array.`);
    }
  }
}

async function run() {
  console.log(`Running edge smoke checks against ${baseUrl}`);

  const searchPayload = await requestJson(
    "/properties-search?transaction=vente&type=appartement&city=Le%20Havre&priceMin=200000&priceMax=350000&surfaceMin=60&surfaceMax=120",
  );
  if (!Array.isArray(searchPayload.items)) {
    throw new Error("properties-search smoke failed: items is not an array.");
  }
  console.log(`properties-search OK (total=${searchPayload.total ?? "n/a"})`);

  const filteredAggregate = await requestJson(
    "/properties-aggregate?scope=current_filtered&transaction=vente&type=appartement&city=Le%20Havre&priceMin=200000&priceMax=350000",
  );
  ensureAggregateContract(filteredAggregate);
  console.log(`properties-aggregate current_filtered OK (count=${filteredAggregate.metrics.count})`);

  const globalAggregate = await requestJson("/properties-aggregate?scope=global_active_inventory");
  ensureAggregateContract(globalAggregate);
  console.log(`properties-aggregate global_active_inventory OK (count=${globalAggregate.metrics.count})`);

  if (runChatbotSmoke) {
    const chatbotPayload = await requestJson("/chatbot-assistant", {
      method: "POST",
      body: JSON.stringify({
        question: "Quelle est la surface moyenne des appartements à vendre au Havre entre 200k et 350k ?",
        capabilities: {
          stream: false,
          multimodalCards: false,
        },
      }),
    });

    if (!Array.isArray(chatbotPayload.actions)) {
      throw new Error("chatbot-assistant smoke failed: actions missing.");
    }
    const hasStatsAction = chatbotPayload.actions.some(
      (action) => action && typeof action === "object" && action.kind === "stats_summary",
    );
    if (!hasStatsAction) {
      throw new Error("chatbot-assistant smoke failed: no stats_summary action returned.");
    }
    console.log("chatbot-assistant aggregate smoke OK");
  } else {
    console.log("Skipping chatbot-assistant smoke (set SMOKE_CHATBOT=true to enable).");
  }

  console.log("All edge smoke checks passed.");
}

run().catch((error) => {
  console.error("Edge smoke checks failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
