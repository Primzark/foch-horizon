#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import vm from "node:vm";
import ts from "typescript";

const projectRoot = process.cwd();
const outputPath = resolve(projectRoot, "supabase/fixtures/property-feed.json");

function loadTypeScriptModule(filePath) {
  const source = readFileSync(filePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filePath,
  }).outputText;

  const module = { exports: {} };
  vm.runInNewContext(transpiled, {
    module,
    exports: module.exports,
    require: (specifier) => {
      throw new Error(`Unexpected runtime import in ${filePath}: ${specifier}`);
    },
    Map,
    Set,
    Date,
  }, { filename: filePath });
  return module.exports;
}

const { properties } = loadTypeScriptModule(resolve(projectRoot, "src/features/listings/data/properties.ts"));
const { cities } = loadTypeScriptModule(resolve(projectRoot, "src/features/cities/data/cities.ts"));
const { agents } = loadTypeScriptModule(resolve(projectRoot, "src/features/listings/data/agents.ts"));

if (![properties, cities, agents].every(Array.isArray)) {
  throw new Error("Could not read properties, cities, and agents from the local inventory modules.");
}

const statusCounts = Object.fromEntries(
  [...new Set(properties.map((property) => property.status))].map((status) => [
    status,
    properties.filter((property) => property.status === status).length,
  ]),
);

const feed = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: "src/features/listings/data/properties.ts",
  propertyReferenceField: "id",
  counts: {
    properties: properties.length,
    cities: cities.length,
    agents: agents.length,
    propertyStatuses: statusCounts,
  },
  properties: properties.map((property) => ({
    ...property,
    sourceStatus: property.sourceStatus ?? null,
  })),
  cities,
  agents,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(feed, null, 2)}\n`, "utf8");
console.log(`Wrote ${properties.length} properties to ${outputPath}`);
console.log(`Status counts: ${JSON.stringify(statusCounts)}`);
