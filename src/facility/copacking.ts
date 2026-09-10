import type { FacilityPackage } from './types';
import type { RelationshipRecord } from '../types/facility';

export type ClaimState = 'UNKNOWN' | 'USER_REPORTED' | 'VERIFIED' | 'DISPUTED';
export interface Claim { value: string | null; status: ClaimState; source: string; evidenceIds: string[]; verifiedAt: string; reviewer: string; conflicts: string; }
export const emptyClaim = (): Claim => ({ value: null, status: 'UNKNOWN', source: '', evidenceIds: [], verifiedAt: '', reviewer: '', conflicts: '' });
interface RecordBase { id: string; facilityId: string; name: string; }
export interface ProcessStage extends RecordBase { lineId: string; flow: 'CONTAINER' | 'CASE_SUPPORT' | 'PALLET'; order: number; optional: boolean; alternative: string; assetId: string | null; candidates: string[]; claim: Claim; assignment: Claim; }
export interface Product extends RecordBase { sku: string; claim: Claim; }
export const packagingFields = ['material','size','unit','closure','decoration','caseQuantity','caseConfiguration','palletPattern'] as const;
export interface PackagingFormat extends RecordBase { revision: number; material: string; size: number | null; unit: string; closure: string; decoration: string; caseQuantity: number | null; caseConfiguration: string; palletPattern: string; claim: Claim; fieldClaims?: Partial<Record<typeof packagingFields[number],Claim>>; }
export interface Recipe extends RecordBase { revision: number; productId: string; formatId: string; approval: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'RETIRED'; requirements: string; source: string; evidenceIds: string[]; approvedBy: string; approvedAt: string; }
export interface ChangeParts extends RecordBase { assetId: string; formatId: string; parts: string; compatibility: Claim; }
export interface ProductionRun extends RecordBase { lineId: string; productId: string; formatId: string; recipeId: string; assetIds: string[]; startedAt: string; endedAt: string; status: 'PLANNED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED'; notes: string; actualRate: number | null; rateUnit: string; downtimeMinutes: number | null; rejects: number | null; constraints: string; measurementSource: string; assumptions: string; snapshot: { product: Product; format: PackagingFormat; recipe: Recipe }; }
export interface Copacking { stages: ProcessStage[]; products: Product[]; formats: PackagingFormat[]; recipes: Recipe[]; changeParts: ChangeParts[]; runs: ProductionRun[]; lineClaims: Record<string, Claim>; }
export const emptyCopacking = (): Copacking => ({ stages: [], products: [], formats: [], recipes: [], changeParts: [], runs: [], lineClaims: {} });
const recordJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(recordJson).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([key,v]) => `${JSON.stringify(key)}:${recordJson(v)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'undefined';
};

/** References are scoped to the containing facility package, including imported records. */
export function validateCopacking(pkg: FacilityPackage) {
  const c = pkg.facility.production?.copacking; if (!c) return;
  const fail = (message: string): never => { throw new Error(`Co-packing: ${message}`); };
  const lines = new Set(pkg.facility.production!.lines.map(l => l.id));
  const assets = new Set(pkg.assets.map(a => a.id)); const evidence = new Set(pkg.evidence.map(e => e.id));
  const ids = new Set<string>([pkg.facility.id,...lines,...pkg.assets.map(a => a.id),...pkg.areas.map(a => a.id),...pkg.components.map(a => a.id),...pkg.documents.map(a => a.id),...evidence]);
  for (const key of ['stages','products','formats','recipes','changeParts','runs'] as const) {
    if (!Array.isArray(c[key])) fail(`${key} must be an array`);
    for (const r of c[key]) { if (!r.id || ids.has(r.id) || !r.name?.trim() || r.facilityId !== pkg.facility.id) fail('invalid, duplicate or cross-facility record'); ids.add(r.id); }
  }
  function claim(v: Claim) {
    if (!v || !['UNKNOWN','USER_REPORTED','VERIFIED','DISPUTED'].includes(v.status) || !Array.isArray(v.evidenceIds) || v.evidenceIds.some(id => !evidence.has(id))) fail('invalid claim evidence');
    if (v.status === 'VERIFIED' && (!v.value?.trim() || !v.evidenceIds.length || !v.source.trim() || !v.verifiedAt || !v.reviewer.trim())) fail('verified claims require value, evidence, source, date and reviewer');
    if (v.status === 'USER_REPORTED' && !v.source.trim()) fail('reported claims require a source');
    if (v.status === 'DISPUTED' && !v.conflicts.trim()) fail('disputed claims require conflicting claims');
  }
  const positive = (n: number | null) => n === null || (Number.isFinite(n) && n > 0);
  const nonnegative = (n: number | null) => n === null || (Number.isFinite(n) && n >= 0);
  const format = (f: PackagingFormat) => {
    claim(f.claim);
    if (!Number.isInteger(f.revision) || f.revision < 1 || !positive(f.size) || (f.size !== null && !f.unit.trim()) || !positive(f.caseQuantity) || (f.caseQuantity !== null && !Number.isInteger(f.caseQuantity))) fail('invalid format units, quantity or revision');
    for (const [key,v] of Object.entries(f.fieldClaims ?? {})) {
      if (!packagingFields.includes(key as typeof packagingFields[number])) fail('unknown packaging claim field');
      claim(v);
      if (v.status==='VERIFIED' && (f[key as typeof packagingFields[number]] === null || v.value !== String(f[key as typeof packagingFields[number]]))) fail('field verification must match the exact packaging value');
    }
  };
  const recipe = (r: Recipe) => { if (!Number.isInteger(r.revision) || r.revision < 1 || !['DRAFT','IN_REVIEW','APPROVED','RETIRED'].includes(r.approval) || !Array.isArray(r.evidenceIds) || r.evidenceIds.some(id => !evidence.has(id))) fail('invalid recipe revision or evidence'); if (r.approval === 'APPROVED' && (!r.source.trim() || !r.evidenceIds.length || !r.approvedAt || !r.approvedBy.trim())) fail('process approval requires source evidence, approver and date'); };
  for (const [lineId,v] of Object.entries(c.lineClaims)) { if (!lines.has(lineId)) fail('unknown line'); claim(v); }
  for (const s of c.stages) { if (!lines.has(s.lineId) || (s.assetId !== null && !assets.has(s.assetId)) || !Number.isInteger(s.order) || s.order < 0 || !['CONTAINER','CASE_SUPPORT','PALLET'].includes(s.flow) || typeof s.optional !== 'boolean') fail('invalid stage reference or order'); claim(s.claim); claim(s.assignment); }
  for (const p of c.products) claim(p.claim);
  for (const f of c.formats) format(f);
  for (const r of c.recipes) { recipe(r); if (!c.products.some(p => p.id === r.productId) || !c.formats.some(f => f.id === r.formatId)) fail('recipe product or format is missing'); }
  for (const p of c.changeParts) { if (!assets.has(p.assetId) || !c.formats.some(f => f.id === p.formatId)) fail('change parts reference missing equipment or format'); claim(p.compatibility); }
  for (const r of c.runs) {
    if (!lines.has(r.lineId) || r.assetIds.some(id => !assets.has(id)) || !c.products.some(p => p.id === r.productId) || !c.formats.some(f => f.id === r.formatId) || !c.recipes.some(p => p.id === r.recipeId)) fail('run has missing or cross-facility references');
    if (!['PLANNED','RUNNING','COMPLETED','CANCELLED'].includes(r.status) || !nonnegative(r.actualRate) || !nonnegative(r.downtimeMinutes) || !nonnegative(r.rejects) || (r.rejects !== null && !Number.isInteger(r.rejects))) fail('invalid run observations');
    if (r.actualRate !== null && (!r.rateUnit.trim() || !r.measurementSource.trim())) fail('actual rate requires units and measurement source');
    if ((r.startedAt && !Number.isFinite(Date.parse(r.startedAt))) || (r.endedAt && (!Number.isFinite(Date.parse(r.endedAt)) || !r.startedAt || Date.parse(r.endedAt) < Date.parse(r.startedAt))) || (r.status === 'COMPLETED' && (!r.startedAt || !r.endedAt))) fail('invalid run timestamps');
    const s = r.snapshot;
    if (!s || s.product.id !== r.productId || s.format.id !== r.formatId || s.recipe.id !== r.recipeId || s.recipe.productId !== r.productId || s.recipe.formatId !== r.formatId || [s.product,s.format,s.recipe].some(v => v.facilityId !== pkg.facility.id)) fail('invalid historical run snapshot');
    claim(s.product.claim); format(s.format); recipe(s.recipe);
    if (recordJson(s.format)!==recordJson(c.formats.find(f => f.id===r.formatId)) || recordJson(s.recipe)!==recordJson(c.recipes.find(v => v.id===r.recipeId))) fail('historical snapshot differs from its immutable revision');
  }
}

export function snapshotRun(c: Copacking, r: Omit<ProductionRun, 'snapshot'>): ProductionRun {
  const product = c.products.find(p => p.id === r.productId), format = c.formats.find(f => f.id === r.formatId), recipe = c.recipes.find(p => p.id === r.recipeId);
  if (!product || !format || !recipe || recipe.productId !== product.id || recipe.formatId !== format.id) throw new Error('Select a matching product, format and exact recipe revision.');
  return { ...r, snapshot: structuredClone({ product, format, recipe }) };
}

/** Retained revisions and run configurations cannot be rewritten through editors/review. */
export function validateCopackingTransition(before: FacilityPackage, after: FacilityPackage) {
  const old = before.facility.production?.copacking, next = after.facility.production?.copacking;
  if (!old) return;
  if (!next) throw new Error('Co-packing records cannot be removed; preserve historical revisions.');
  for (const key of ['formats','recipes'] as const) for (const row of old[key]) {
    if (recordJson(next[key].find(r => r.id === row.id)) !== recordJson(row)) throw new Error('Saved format and recipe revisions are immutable. Copy to a new revision.');
  }
  for (const row of old.runs) {
    const r = next.runs.find(r => r.id === row.id);
    if (!r || ['lineId','productId','formatId','recipeId','assetIds','snapshot'].some(key => recordJson(r[key as keyof ProductionRun]) !== recordJson(row[key as keyof ProductionRun]))) throw new Error('Recorded run configuration and historical snapshot are immutable.');
  }
}

/** Fail closed as a whole collection so exporting never alters a historical snapshot. */
export function portableCopacking(c: Copacking | undefined, allowedEvidence: Set<string>): Copacking | undefined {
  if (!c) return undefined;
  function allowed(value: unknown): boolean {
    if (!value || typeof value !== 'object') return true;
    return Object.entries(value).every(([key,child]) => key === 'evidenceIds' && Array.isArray(child) ? child.every(id => allowedEvidence.has(id)) : allowed(child));
  }
  return allowed(c) ? structuredClone(c) : undefined;
}

/** Derived record graph uses existing edge shapes; it does not seed physical flow edges. */
export function copackingGraph(pkg: FacilityPackage) {
  const c = pkg.facility.production?.copacking ?? emptyCopacking();
  const nodes = [...(pkg.facility.production?.lines ?? []).map(l => ({id:l.id,name:l.name})),...c.stages,...c.products,...c.formats,...c.recipes,...c.changeParts,...c.runs,...pkg.assets,...pkg.evidence.map(e => ({id:e.id,name:e.title}))];
  const edges: RelationshipRecord[] = [];
  const edge = (source: string, target: string, type: RelationshipRecord['type'], note: string, claim?: Claim) => {
    edges.push({id:`copacking:${source}:${type}:${target}`,source,target,type,note,verificationStatus:claim?.status==='VERIFIED' ? 'VERIFIED' : claim?.status==='DISPUTED' ? 'DISPUTED' : 'FIELD_VERIFY',evidenceIds:claim?.evidenceIds ?? [],sourceReference:claim?.source ?? 'Application record reference; not a physical equipment dependency',verifiedAt:claim?.verifiedAt ?? ''});
  };
  for (const s of c.stages) { edge(s.lineId,s.id,'CONTAINS','Reported process-stage membership',s.claim); if(s.assetId) edge(s.id,s.assetId,'CONTAINS','Equipment assigned to stage; shared equipment retains one identity',s.assignment); }
  for (const r of c.recipes) { edge(r.productId,r.id,'CONTAINS','Product specification revision'); edge(r.id,r.formatId,'CONTAINS','Specification references exact packaging revision'); for(const id of r.evidenceIds) edge(r.id,id,'SUPPORTED_BY_EVIDENCE','Specification source; approval remains separate'); }
  for (const p of c.changeParts) { edge(p.assetId,p.id,'CONTAINS','Equipment change-part set'); edge(p.id,p.formatId,'CONTAINS','Format applicability',p.compatibility); }
  for (const r of c.runs) { edge(r.lineId,r.id,'CONTAINS','Recorded run'); edge(r.id,r.productId,'CONTAINS','Run product; historical value in snapshot'); edge(r.id,r.formatId,'CONTAINS','Exact run format revision'); edge(r.id,r.recipeId,'CONTAINS','Exact run specification revision'); for(const id of r.assetIds) edge(r.id,id,'CONTAINS','Recorded applicable equipment'); }
  return {nodes,edges};
}

export function mergeCopacking(current: Copacking | undefined, incoming: Copacking | undefined): Copacking | undefined {
  if (!current || !incoming) return structuredClone(incoming ?? current);
  const merge = <T extends {id: string}>(a: T[], b: T[]) => [...new Map([...a,...b].map(r => [r.id,structuredClone(r)])).values()];
  for (const key of ['formats','recipes'] as const) for (const r of current[key]) {
    const other = incoming[key].find(v => v.id===r.id);
    if (other && recordJson(other)!==recordJson(r)) throw new Error('Import conflicts with an immutable production revision. Reconcile using a new revision ID.');
  }
  for (const r of current.runs) {
    const other = incoming.runs.find(v => v.id===r.id);
    if (other && ['lineId','productId','formatId','recipeId','assetIds','snapshot'].some(key => recordJson(other[key as keyof ProductionRun])!==recordJson(r[key as keyof ProductionRun]))) throw new Error('Import conflicts with historical run configuration.');
  }
  const stages = merge(current.stages,incoming.stages).map(s => {
    const old = current.stages.find(v => v.id===s.id);
    if (!old || old.assetId===s.assetId) return s;
    return {...s,assetId:old.assetId,assignment:{...old.assignment,status:'DISPUTED' as const,conflicts:[old.assignment.conflicts,s.assignment.conflicts,`Import assignment conflict: existing ${old.assetId ?? 'unassigned'}; incoming ${s.assetId ?? 'unassigned'}. Confirm the assignment with evidence.`].filter(Boolean).join('\n')}};
  });
  return {stages,products:merge(current.products,incoming.products),formats:merge(current.formats,incoming.formats),recipes:merge(current.recipes,incoming.recipes),changeParts:merge(current.changeParts,incoming.changeParts),runs:merge(current.runs,incoming.runs),lineClaims:{...current.lineClaims,...incoming.lineClaims}};
}
