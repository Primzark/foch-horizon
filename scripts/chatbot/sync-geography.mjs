import { createServer } from "vite";
import { writeFile } from "node:fs/promises";
const server = await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true},logLevel:"silent"});
try {
 const { geographyGuides } = await server.ssrLoadModule("/src/features/content/data/geographyGuides.ts");
 const { leHavreDistrictHistory } = await server.ssrLoadModule("/src/features/content/data/leHavreHistoryContent.ts");
 const legacy = leHavreDistrictHistory.filter(d=>!geographyGuides.some(g=>g.id===d.id)).map(d=>({id:d.id,name:d.name,placeType:"quartier",subtitle:d.summary,historyArchitecture:d.investmentAngle,typicalHomes:"",listingSearch:{city:"le-havre"}}));
 await writeFile("supabase/functions/_shared/chatbot-geography.json", JSON.stringify([...geographyGuides,...legacy].map(g=>({id:g.id,name:g.name,kind:g.placeType??(["la-plage","gobelins","saint-michel"].includes(g.id)?"quartier":"commune"),text:[g.subtitle,g.historyArchitecture,g.typicalHomes].join("\n\n").replace(/\[([^\]]+)\]\([^)]+\)/g,"$1"),city:g.listingSearch.city})),null,2)+"\n");
} finally { await server.close(); }
