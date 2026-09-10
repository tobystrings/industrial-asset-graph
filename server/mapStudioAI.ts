import { planWithGemini } from '../supabase/functions/_shared/mapPlanner.js';
export { validateAIPlan, validatePlanningInput } from '../supabase/functions/_shared/mapPlanner.js';
export function mapAIStatus() { return {configured:Boolean(process.env.GEMINI_API_KEY?.trim())}; }
export function planMapEdit(raw:unknown, fetcher:typeof fetch=fetch) { return planWithGemini(raw,process.env.GEMINI_API_KEY??'',fetcher); }
