#!/usr/bin/env node

import http from "node:http";

const PORT = Number.parseInt(process.env.PORT ?? "8787", 10) || 8787;
const HOST = process.env.HOST ?? "127.0.0.1";
const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.PAGE_RENDERER_TIMEOUT_MS ?? "4000", 10) || 4000;

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("payload_too_large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function isSafePath(path) {
  return typeof path === "string" && /^\/[a-z0-9/_-]+(?:\?[a-z0-9=&_-]+)?$/i.test(path) && !/^\/(?:api|admin|functions)\b/i.test(path);
}

function extractRenderedText(document) {
  const title = document.title?.trim() || null;
  const headings = [...document.querySelectorAll("h1,h2,h3")]
    .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 12);
  const bodyText = (document.body?.innerText || "").replace(/\s+/g, " ").trim();
  return {
    title,
    headings,
    text: bodyText.slice(0, 20000),
  };
}

let browserPromise = null;
async function getBrowser() {
  if (!browserPromise) {
    const { chromium } = await import("playwright");
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
}

async function renderPage({ path, baseUrl, timeoutMs }) {
  const startedAt = Date.now();
  if (!isSafePath(path)) {
    return { ok: false, code: "invalid_path", error: "Invalid path." };
  }
  let url;
  try {
    const base = new URL(baseUrl);
    url = new URL(path, base);
    if (url.origin !== base.origin) {
      return { ok: false, code: "cross_origin", error: "Cross-origin path is not allowed." };
    }
  } catch {
    return { ok: false, code: "invalid_base_url", error: "Invalid baseUrl." };
  }

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(url.toString(), {
      waitUntil: "networkidle",
      timeout: Math.max(1000, timeoutMs || DEFAULT_TIMEOUT_MS),
    });
    const snapshot = await page.evaluate(extractRenderedText);
    return {
      ok: true,
      path,
      finalUrl: page.url(),
      title: snapshot.title,
      headings: snapshot.headings,
      text: snapshot.text,
      fetchedAt: new Date().toISOString(),
      renderMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      code: "render_failed",
      error: error instanceof Error ? error.message : "Render failed",
    };
  } finally {
    await page.close().catch(() => undefined);
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return sendJson(res, 200, { ok: true });
  }
  if (req.method !== "POST" || req.url !== "/render") {
    return sendJson(res, 404, { ok: false, error: "Not found" });
  }
  try {
    const raw = await collectBody(req);
    const payload = raw ? JSON.parse(raw) : {};
    const path = typeof payload.path === "string" ? payload.path : "";
    const baseUrl = typeof payload.baseUrl === "string" ? payload.baseUrl : "";
    const timeoutMs = Number.isFinite(Number(payload.timeoutMs)) ? Number(payload.timeoutMs) : DEFAULT_TIMEOUT_MS;
    const result = await renderPage({ path, baseUrl, timeoutMs });
    return sendJson(res, result.ok ? 200 : 400, result);
  } catch (error) {
    return sendJson(res, 400, {
      ok: false,
      code: "bad_request",
      error: error instanceof Error ? error.message : "Invalid request",
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`page-renderer-server listening on http://${HOST}:${PORT}`);
});

process.on("SIGINT", async () => {
  server.close(() => {
    process.exit(0);
  });
  try {
    const browser = await browserPromise;
    if (browser) await browser.close();
  } catch {
    // Ignore close errors.
  }
});

