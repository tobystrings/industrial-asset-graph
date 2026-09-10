import type { FacilityPackage } from './types';
import type { FacilityAsset, VerificationState } from '../types/facility';

export interface ProductionLine { id: string; name: string; importance: number; rationale: string; }
export interface SurveyItem { id: string; category: string; action: string; lineId: string; state: 'OPEN' | 'RECORDED' | 'NOT_APPLICABLE'; notes: string; }
export interface ProductionConfig {
  copacking?: import('./copacking').Copacking;
  lines: ProductionLine[];
  taxonomy: string[];
  survey: SurveyItem[];
  weights: { line: number; shared: number; failures: number; redundancy: number; spares: number; gaps: number };
}
export interface AssetProduction {
  memberships: { lineId: string; verificationStatus: VerificationState; evidenceIds: string[]; source: string; verifiedAt: string }[];
  stage: string;
  electrical: Record<string, string>;
  redundancy: 'UNKNOWN' | 'NONE' | 'DOCUMENTED';
  spares: 'UNKNOWN' | 'UNAVAILABLE' | 'AVAILABLE';
  safetySignificance: string;
  service: { id: string; date: string; symptom: string; observation: string; action: string; spareParts: string; task: string; evidenceIds: string[] }[];
}
export const emptyProduction = (): ProductionConfig => ({ lines: [], taxonomy: [], survey: [], weights: { line: 10, shared: 5, failures: 3, redundancy: 2, spares: 2, gaps: 1 } });
export const emptyAssetProduction = (): AssetProduction => ({ memberships: [], stage: '', electrical: {}, redundancy: 'UNKNOWN', spares: 'UNKNOWN', safetySignificance: '', service: [] });
export function memberships(pkg: FacilityPackage, asset: FacilityAsset) {
  if (asset.production) return asset.production.memberships;
  const line = pkg.facility.production?.lines.find(item => item.name === asset.line);
  return line ? [{ lineId: line.id, verificationStatus: asset.verificationStatus, evidenceIds: [] as string[], source: `Existing asset record ${asset.id}: ${asset.line}`, verifiedAt: '' }] : [];
}
const impactTypes = new Set(['FEEDS', 'SUPPLIES', 'CONTROLS', 'SENSES', 'INTERLOCKS_WITH', 'UPSTREAM_OF', 'SENDS_DATA_TO', 'MECHANICALLY_DRIVES']);
export function potentialImpact(pkg: FacilityPackage, start: string) {
  const reached = new Set([start]); const paths: { id: string; via: string[] }[] = [{ id: start, via: [] }];
  for (let cursor = 0; cursor < paths.length; cursor++) {
    const current = paths[cursor];
    for (const rel of pkg.relationships) {
      if (rel.verificationStatus !== 'VERIFIED' || !rel.evidenceIds.length) continue;
      const next = rel.type === 'DOWNSTREAM_OF' && rel.target === current.id ? rel.source : impactTypes.has(rel.type) && rel.source === current.id ? rel.target : null;
      if (next && !reached.has(next)) { reached.add(next); paths.push({ id: next, via: [...current.via, rel.id] }); }
    }
  }
  const lines = (pkg.facility.production?.lines ?? []).filter(line => pkg.assets.some(asset => asset.verificationStatus !== 'RETIRED' && reached.has(asset.id) && memberships(pkg, asset).some(m => m.lineId === line.id && m.verificationStatus === 'VERIFIED' && m.evidenceIds.length)));
  return { lines, paths, unresolved: pkg.relationships.filter(r => (reached.has(r.source) || reached.has(r.target)) && (r.verificationStatus !== 'VERIFIED' || !r.evidenceIds.length)) };
}
export function documentationTasks(pkg: FacilityPackage, asset: FacilityAsset) {
  const tasks: string[] = [];
  if (!asset.serialNumber.value) tasks.push('Photograph nameplate and record serial number');
  if (!memberships(pkg, asset).some(m => m.verificationStatus === 'VERIFIED' && m.evidenceIds.length)) tasks.push('Confirm line membership with evidence');
  if (!pkg.relationships.some(r => r.target === asset.id && ['FEEDS', 'SUPPLIES'].includes(r.type) && r.verificationStatus === 'VERIFIED')) tasks.push('Identify electrical feed and trace utility connections');
  if (!pkg.documents.some(d => d.assetId === asset.id && /manual/i.test(d.title + d.category))) tasks.push('Attach the correct equipment manual');
  if (asset.componentIds.length && !asset.production?.electrical['Drive configuration']) tasks.push('Record drive configuration and source reference');
  if (asset.verificationStatus === 'DISPUTED' || asset.facts.some(f => f.value.verificationStatus === 'DISPUTED')) tasks.push('Resolve conflicting evidence without removing original values');
  tasks.push(...asset.unknowns);
  return [...new Set(tasks)];
}
export function reliabilityPriority(pkg: FacilityPackage, asset: FacilityAsset) {
  const cfg = pkg.facility.production ?? emptyProduction();
  const supported = new Set([...memberships(pkg, asset).map(m => m.lineId), ...potentialImpact(pkg, asset.id).lines.map(l => l.id)]);
  const importance = Math.max(0, ...cfg.lines.filter(l => supported.has(l.id)).map(l => l.importance));
  const factors = { line: importance, shared: Math.max(0, potentialImpact(pkg, asset.id).lines.length - 1), failures: asset.production?.service.filter(s => s.symptom.trim()).length ?? 0, redundancy: asset.production?.redundancy === 'NONE' ? 1 : 0, spares: asset.production?.spares === 'UNAVAILABLE' ? 1 : 0, gaps: documentationTasks(pkg, asset).length };
  return { score: Object.entries(factors).reduce((sum, [key, value]) => sum + value * cfg.weights[key as keyof typeof factors], 0), factors };
}
