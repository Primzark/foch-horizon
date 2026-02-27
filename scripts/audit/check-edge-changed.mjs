import { execSync, spawnSync } from "node:child_process";

function parseStatusPath(line) {
  if (!line.trim()) return null;
  const payload = line.slice(3).trim();
  if (!payload) return null;
  const renamedIndex = payload.indexOf(" -> ");
  if (renamedIndex >= 0) {
    return payload.slice(renamedIndex + 4).trim();
  }
  return payload.trim();
}

const statusOutput = execSync("git status --porcelain -- supabase/functions", { encoding: "utf8" });
const changedEntryPoints = Array.from(
  new Set(
    statusOutput
      .split("\n")
      .map(parseStatusPath)
      .filter((path) => typeof path === "string" && path.endsWith("/index.ts")),
  ),
);

if (changedEntryPoints.length === 0) {
  console.log("No changed edge entrypoints detected under supabase/functions.");
  process.exit(0);
}

let failures = 0;
for (const file of changedEntryPoints) {
  console.log(`Checking ${file} ...`);
  const result = spawnSync("deno", ["check", file], { stdio: "inherit" });
  if (result.status !== 0) {
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`Edge check failed for ${failures} changed entrypoint(s).`);
  process.exit(1);
}

console.log(`Edge check passed for ${changedEntryPoints.length} changed entrypoint(s).`);
