import { describe, expect, it } from 'vitest';
import { chatbotPlaces, geographyReply } from '../../supabase/functions/_shared/chatbot-geography';
import { parsePriceHints, filterExcludedFeatures } from '../../supabase/functions/_shared/chatbot-search-criteria';
import { buildConversationContext, decideChatbotRoute } from '@/features/content/api/chatbot.service';
describe('chatbot audit regressions', () => {
 it('removes negated planner feature phrases without dropping unrelated requirements', () => expect(filterExcludedFeatures(['sans balcon','balcon','terrasse'],['balcon'])).toEqual(['terrasse']));
 for (const place of chatbotPlaces) it(`answers the supported guide ${place.name}`, () => {
  const reply = geographyReply(`Parlez-moi de ${place.name}.`);
  expect(reply?.answer).toContain(place.name);
  const legacyRoutes: Record<string,string> = {perret:"/immobilier/centre-ville","saint-vincent":"/immobilier/la-plage",sanvic:"/geographie",graville:"/geographie","eure-docks":"/geographie"};
  expect(reply?.suggestedPrompts).toContain(`Ouvrir ${legacyRoutes[place.id] ?? `/immobilier/${place.id}`}`);
 });
 it('does not intercept fees or contact requests mentioning a place', () => { expect(geographyReply('Comment contacter votre agence au Havre ?')).toBeNull(); expect(geographyReply('Quels sont les honoraires à Sainte-Adresse ?')).toBeNull(); });
 it('does not intercept actual listing requests', () => expect(geographyReply('Je cherche un appartement à Harfleur')).toBeNull());
 it('does not confuse Paris with a local neighborhood', () => expect(geographyReply('Parlez-moi de Notre-Dame à Paris')?.answer).toContain('secteur local'));
 it('prioritizes an explicit handoff over its contact label', () => {
  const context=buildConversationContext('Préremplir le formulaire de contact',[]);
  expect(decideChatbotRoute(context,{edgeApiEnabled:true,edgeRagForWebsiteQuestionsEnabled:true,routerV2Enabled:true},{actionRequest:{type:'prepare_handoff'}}).target).toBe('edge');
 });
 it('recognizes contact without matching acte inside contacter', () => expect(buildConversationContext('Comment contacter votre agence ?',[]).inferredIntent).toBe('contact'));
 it('parses compact and decimal budgets', () => {
  expect(parsePriceHints('budget 300k').priceMax).toBe(300000);
  expect(parsePriceHints('budget 1,2 million').priceMax).toBe(1200000);
 });
});
