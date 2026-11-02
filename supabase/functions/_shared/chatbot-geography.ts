import guides from "./chatbot-geography.json" with { type: "json" };
export function normalizePlace(value: string): string {
 return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
export function resolvePlaces(question: string) {
 const text = ` ${normalizePlace(question)} `;
 return guides.filter(g => [g.name,g.id].some(alias => text.includes(` ${normalizePlace(alias)} `)));
}
export function geographyReply(question: string, language = "fr") {
 if (/\b(cherche|recherche|trouve|acheter|budget|chambres?|search|find|buy|bedrooms?)\b/i.test(normalizePlace(question)) && !/\b(quel quartier|quels quartiers|atouts|avantages)\b/.test(normalizePlace(question))) return null;
 const normalized = normalizePlace(question);
 if (/\b(locatif|locative|loyer|louer|rent|rental|lease|honoraires?|commission|contact|contacter|telephone|email|notaire|compromis|biens?|annonces?|properties|listings|fees|call)\b/.test(normalized)) return null;
 const places = resolvePlaces(question);
 if (!/\b(parlez|presentez|decrivez|expliquez|atouts|avantages|histoire|difference|quartier|quartiers|ecoles?|commerces?|transport|tell|about|neighbourhood|neighborhood)\b/.test(normalized) && !places.some(g => normalizePlace(g.name) === normalized)) return null;
 if (places.length && /\b(paris|lyon|marseille|bordeaux|copenhague)\b/.test(normalizePlace(question))) return {answer: language === "en" ? "Our guides cover Le Havre and the surrounding communes. Did you mean the local area with this name?" : "Nos guides concernent Le Havre et les communes alentour. Souhaitez-vous parler du secteur local portant ce nom ?", suggestedPrompts:["Le Havre"]};
 if (!places.length) return null;
 const english = language === "en";
 return {
 answer: places.map(g => english
 ? `${g.name} is ${g.kind === "quartier" ? "a neighbourhood of Le Havre" : "a separate commune"}. Our local guide covers housing, architecture, amenities and transport: /immobilier/${g.id}.`
 : `${g.name} — ${g.kind === "quartier" ? "quartier du Havre" : "commune"}. ${g.text.slice(0,1250)}\nGuide : /immobilier/${g.id}`).join("\n\n"),
 suggestedPrompts: places.slice(0,3).map(g => `${english ? "Open" : "Ouvrir"} /immobilier/${g.id}`),
 };
}
export { guides as chatbotPlaces };
