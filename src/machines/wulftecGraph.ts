import type { FacilityPackage } from '../facility/types';
import type { ComponentRecord, FacilityAsset } from '../types/facility';

// These are associations to existing dossier record identifiers, not new graph edges.
// Only resolve records owned by the selected asset in the active facility.
export const assemblyRecords: Record<string, readonly string[]> = {
  frame: [], guards: [], cabinet: ['CABINET'], rotor: ['ROTARY-ARM'],
  conveyor: ['INFEED-1', 'WRAPPING-CONVEYOR', 'OUTFEED-1', 'OUTFEED-2', 'OUTFEED-3'],
  carriage: ['PRESTRETCH'], drive: ['PRESTRETCH'], rollers: ['PRESTRETCH'], door: ['PRESTRETCH'], cover: ['PRESTRETCH'],
};
export const carriageAssemblies = ['carriage', 'drive', 'rollers', 'door', 'cover'];
export function isWulftec(asset: FacilityAsset): boolean {
  return /wulftec/i.test(`${asset.manufacturer.value ?? ''} ${asset.name}`) &&
    String(asset.model.value ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase() === 'WCRT200';
}
export function modelAssets(plant: FacilityPackage) {
  return plant.assets.filter(a => a.facilityId === plant.facility.id && isWulftec(a));
}
export function modelAsset(plant: FacilityPackage, requested: string | null) {
  const candidates = modelAssets(plant);
  return requested ? candidates.find(a => a.id === requested) : candidates.length === 1 ? candidates[0] : undefined;
}
export function linkedComponents(plant: FacilityPackage, asset: FacilityAsset, assembly: string) {
  if (!modelAssets(plant).some(a => a.id === asset.id)) return [];
  const ids = (Object.hasOwn(assemblyRecords, assembly) ? assemblyRecords[assembly] : []).map(suffix => `${asset.id}-${suffix}`);
  return plant.components.filter(c => c.parentId === asset.id && asset.componentIds.includes(c.id) && ids.includes(c.id));
}
export function componentAssembly(asset: FacilityAsset, component: ComponentRecord): string | undefined {
  if (!isWulftec(asset) || component.parentId !== asset.id || !asset.componentIds.includes(component.id)) return;
  return Object.entries(assemblyRecords).find(([, suffixes]) => suffixes.some(suffix => component.id === `${asset.id}-${suffix}`))?.[0];
}
export function componentDocuments(plant: FacilityPackage, asset: FacilityAsset, component: ComponentRecord) {
  if (component.parentId !== asset.id || !asset.componentIds.includes(component.id)) return [];
  return plant.documents.filter(d => d.assetId === asset.id && (
    d.evidenceIds.some(id => component.evidenceIds.includes(id)) ||
    d.register?.entries.some(row => row.entityIds.includes(component.id)) ||
    plant.relationships.some(r => r.type === 'HAS_DOCUMENT' && r.source === component.id && r.target === d.id)
  ));
}
export function readModelState(search: string) {
  const p = new URLSearchParams(search);
  const selected = Object.hasOwn(assemblyRecords, p.get('assembly') ?? '') ? p.get('assembly')! : '';
  const scope = p.get('scope') === 'carriage' ? 'carriage' : 'machine';
  const amount = Number(p.get('explode') ?? 0);
  return { selected: scope === 'carriage' && !carriageAssemblies.includes(selected) ? '' : selected, scope,
    explosion: Number.isFinite(amount) ? Math.max(0, Math.min(100, amount)) : 0 };
}
export function modelDetails(assetId: string, assembly = '', scope = 'machine', explosion = 0) {
  return { asset: assetId, assembly, scope, explode: String(explosion) };
}
export function publicGraphHref(search: string, state: ReturnType<typeof readModelState>, protocol = location.protocol, origin = location.origin) {
  const p = new URLSearchParams(search);
  const query = new URLSearchParams({ page: 'wulftec', ...modelDetails(p.get('asset') ?? '', state.selected, state.scope, state.explosion) });
  if (p.get('facilityId')) query.set('facilityId', p.get('facilityId')!);
  return `${protocol === 'file:' ? 'https://tobystrings.github.io' : origin}/industrial-asset-graph/?${query}`;
}
