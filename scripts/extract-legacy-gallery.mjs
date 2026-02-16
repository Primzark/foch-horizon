#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const legacyHost = "https://www.foch-immobilier.fr";
const targetBase = "https://foch.staticlbi.com/900xauto/images/biens";

const listingSources = [
  {
    propertyId: 5139,
    folderPath: "1/3a0fd2baea64ea8a3b1ef12c85ac3033",
    detailPath: "/vente/1-bordeaux/immeuble/11185-immeuble-a-vendre-aux-portes-du-jardin-public-prestige",
  },
  {
    propertyId: 5128,
    folderPath: "1/287dd229b7bcc92335a7749412c6e08c",
    detailPath: "/vente/1-bordeaux/duplex/11181-a-vendre-t1-b-bassins-a-flot",
  },
  {
    propertyId: 5107,
    folderPath: "1/38f856fe074fc18efd5abfbedcf76a1f",
    detailPath: "/vente/27-le-bouscat/appartement/11178-le-bouscat-avenue-de-tivoli",
  },
  {
    propertyId: 5099,
    folderPath: "1/e784247cc135e7601592c2433b140dda",
    detailPath: "/vente/460-marcheprime/maison/11165-maison-de-plain-pied-sur-marcheprime",
  },
  {
    propertyId: 5088,
    folderPath: "7/c7f39cd93b05418e46bdf36f13f1b8bc",
    detailPath: "/vente/3-arcachon/appartement/11158-arcachon-centre-ville-t3-renove",
  },
  {
    propertyId: 5075,
    folderPath: "1/e4f77616b7b74e3728fcb853728d1c58",
    detailPath: "/vente/1-bordeaux/maison/11157-echoppe-a-vendre-quartier-nansouty",
  },
  {
    propertyId: 5061,
    folderPath: "9/ae84a438e10b1197d56b8c675d2b1824",
    detailPath: "/vente/460-marcheprime/maison/11155-maison-de-plain-pied-sur-marcheprime",
  },
  {
    propertyId: 5042,
    folderPath: "7/37a8f8e7c8eba0e8932afc0fd1c0b76d",
    detailPath: "/vente/3-arcachon/appartement/11075-studio-cabine-a-vendre-vue-mer",
  },
];

const outputPath = resolve(process.cwd(), "docs/audit/2026-02-16/gallery-enrichment-manifest.json");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function extractFileNames(folderPath, detailUrl) {
  const response = await fetch(detailUrl);
  if (!response.ok) {
    throw new Error(`Unable to fetch ${detailUrl}: ${response.status}`);
  }

  const html = await response.text();
  const folderEscaped = escapeRegExp(folderPath);
  const imageRegex = new RegExp(`${folderEscaped}/([^"'\\s>]+\\.(?:jpg|jpeg|png|webp))`, "gi");
  const fileNames = [];
  const seen = new Set();
  let match;

  while ((match = imageRegex.exec(html)) !== null) {
    const fileName = match[1];
    if (!seen.has(fileName)) {
      seen.add(fileName);
      fileNames.push(fileName);
    }
  }

  return fileNames;
}

async function main() {
  const items = [];

  for (const source of listingSources) {
    const detailUrl = `${legacyHost}${source.detailPath}`;
    const fileNames = await extractFileNames(source.folderPath, detailUrl);

    items.push({
      propertyId: source.propertyId,
      folderPath: source.folderPath,
      detailPath: source.detailPath,
      fileCount: fileNames.length,
      fileNames,
      imageUrls: fileNames.map((fileName) => `${targetBase}/${source.folderPath}/${fileName}`),
    });
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(
    outputPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourceHost: legacyHost,
        imageBase: targetBase,
        items,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`Gallery manifest written to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
