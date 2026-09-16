import type { FacilityPackage } from '../facility/types';
import type { RelationshipRecord, VerificationState } from '../types/facility';

export interface EquipmentImageView {
  id: string; assetId: string; machineId?: string; label: string; evidenceId: string;
  width: number; height: number;
  regions: { entityId: string; x: number; y: number; width: number; height: number }[];
}
export interface SavedParameterRecord {
  id: string; sourceDocumentId: string; capturedAt?: string;
  verificationStatus: VerificationState;
  values: { code: string; name: string; value: string | number; unit?: string }[];
}
export function imageViews(pkg: FacilityPackage, assetId: string) {
  return (pkg.featureConfig.imageViews ?? []).filter(v => v.assetId === assetId);
}
export function entityLabel(pkg: FacilityPackage, id: string) {
  return pkg.components.find(c => c.id === id)?.label ?? pkg.assets.find(a => a.id === id)?.name ?? id;
}
const kinds: Partial<Record<RelationshipRecord['type'], string>> = {
  FEEDS: 'Power', SUPPLIES: 'Supply', CONTROLS: 'Control', SENDS_DATA_TO: 'Data',
  MECHANICALLY_DRIVES: 'Mechanical', ISOLATES: 'Isolation', SENSES: 'Sensing',
  INTERLOCKS_WITH: 'Interlock', UPSTREAM_OF: 'Process', DOWNSTREAM_OF: 'Process',
};
export function connections(pkg: FacilityPackage, id: string, direction: 'in' | 'out') {
  return pkg.relationships.flatMap(r => {
    if (!kinds[r.type] || r.verificationStatus === 'RETIRED') return [];
    const source = r.type === 'DOWNSTREAM_OF' ? r.target : r.source;
    const target = r.type === 'DOWNSTREAM_OF' ? r.source : r.target;
    if ((direction === 'in' ? target : source) !== id) return [];
    return [{ relationship: r, otherId: direction === 'in' ? source : target, kind: kinds[r.type]! }];
  });
}
export function validateEquipmentImages(pkg: FacilityPackage) {
  const viewIds = new Set<string>();
  for (const v of pkg.featureConfig.imageViews ?? []) {
    if (!v.id || viewIds.has(v.id) || !v.label || !pkg.assets.some(a => a.id === v.assetId) || (v.machineId && !pkg.assets.some(a => a.id === v.machineId)) || !pkg.evidence.some(e => e.id === v.evidenceId) || ![v.width,v.height].every(n => Number.isFinite(n) && n > 0) || !Array.isArray(v.regions)) throw new Error('Invalid equipment image view.');
    viewIds.add(v.id);
    const entities = new Set<string>();
    for (const r of v.regions) {
      if (entities.has(r.entityId) || !(r.entityId === v.assetId || pkg.components.some(c => c.id === r.entityId && c.parentId === v.assetId)) || ![r.x,r.y,r.width,r.height].every(Number.isFinite) || r.x < 0 || r.y < 0 || r.width <= 0 || r.height <= 0 || r.x+r.width > 1 || r.y+r.height > 1) throw new Error('Invalid equipment image region.');
      entities.add(r.entityId);
    }
  }
  for (const c of pkg.components) {
    const ids = new Set<string>();
    for (const record of c.savedParameters ?? []) {
      const doc = pkg.documents.find(d => d.id === record.sourceDocumentId && d.assetId === c.parentId);
      if (!record.id || ids.has(record.id) || !doc || !doc.evidenceIds.length || !['VERIFIED','FIELD_VERIFY','INFERRED','DISPUTED','RETIRED'].includes(record.verificationStatus) || (record.capturedAt && !Number.isFinite(Date.parse(record.capturedAt))) || !Array.isArray(record.values)) throw new Error('Invalid saved parameter record.');
      ids.add(record.id);
      const codes = new Set<string>();
      for (const p of record.values) {
        if (!p.code || codes.has(p.code) || !p.name || !['string','number'].includes(typeof p.value) || (typeof p.value === 'number' && !Number.isFinite(p.value))) throw new Error('Invalid saved parameter value.');
        codes.add(p.code);
      }
    }
  }
}
