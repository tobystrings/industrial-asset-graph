import type { FacilityPackage } from '../../facility/types';
import { documentationTasks } from '../../facility/production';
import type { GuideContext } from './guideTypes';

/** Inspect only the supplied facility; never substitute a different asset. */
export function buildGuideContext(pkg: FacilityPackage, selection: GuideContext): GuideContext {
  const selectedLink = pkg.relationships.find(r => r.id === selection.connectionId);
  const linkedAsset = selectedLink && [selectedLink.source, selectedLink.target].map(id => pkg.assets.find(a => a.id === id) ?? pkg.assets.find(a => a.id === pkg.components.find(component => component.id === id)?.parentId)).find(Boolean);
  const asset = pkg.assets.find(a => a.id === (selection.assetId ?? linkedAsset?.id) && a.facilityId === pkg.facility.id);
  const area = pkg.areas.find(a => a.id === (asset?.areaId ?? selection.areaId));
  const base: GuideContext = { page: selection.page, routePage: selection.routePage, facilityId: pkg.facility.id, facilityName: pkg.facility.name,
    areaId: area?.id, areaName: area?.name, editingMap: selection.editingMap };
  if (!asset) return base;
  const docs = pkg.documents.filter(d => d.assetId === asset.id);
  const required = docs.filter(d => d.required);
  const links = pkg.relationships.filter(r => r.source === asset.id || r.target === asset.id);
  const weights = { COMPLETE: 1, REVIEW: .8, IN_PROGRESS: .5, DRAFT: .25, NOT_STARTED: 0 };
  const facts: NonNullable<GuideContext['facts']> = [
    { label: 'Manufacturer', value: asset.manufacturer }, { label: 'Model', value: asset.model },
    { label: 'Serial number', value: asset.serialNumber }, ...asset.facts,
  ].filter(f => f.value.value !== null && String(f.value.value).trim() !== '').map(f => ({
    label: f.label, value: String(f.value.value), state: f.value.verificationStatus,
    source: asset.id + ' · ' + (f.value.evidenceIds.join(', ') || 'no evidence reference'),
  }));
  for (const [label, value] of Object.entries(asset.production?.electrical ?? {})) {
    if (value.trim()) facts.push({ label, value, state: 'UNVERIFIED', source: asset.id + ' · field sheet (no per-field verification)' });
  }
  const labels: Record<string, string[]> = { 'Electrical source': ['electrical source', 'supply'], Disconnect: ['disconnect'], Panel: ['panel'], Circuit: ['circuit', 'breaker number'], Voltage: ['voltage', 'supply voltage'], Phase: ['phase'], Amperage: ['amperage'], 'Control voltage': ['control voltage'], 'Safety devices': ['safety devices', 'interlocks'] };
  const electricalGaps = Object.keys(labels).filter(label => !facts.some(f => labels[label].includes(f.label.toLowerCase()) && !/^(unknown|unrecorded|not documented|field verify|n\/a)$/i.test(f.value.trim())));
  const evidenceIds = new Set([...docs.flatMap(d => d.evidenceIds), ...links.flatMap(r => r.evidenceIds),
    ...asset.facts.flatMap(f => f.value.evidenceIds), ...[asset.manufacturer, asset.model, asset.serialNumber].flatMap(f => f.evidenceIds)]);
  const verified = links.filter(r => r.verificationStatus === 'VERIFIED' && r.evidenceIds.some(id => pkg.evidence.some(e => e.id === id)));
  const dependencies = verified.filter(r => ['FEEDS', 'SUPPLIES', 'CONTROLS', 'SENSES', 'INTERLOCKS_WITH', 'MECHANICALLY_DRIVES'].includes(r.type));
  const entityName = (id: string) => pkg.assets.find(a => a.id === id)?.name ?? pkg.components.find(c => c.id === id)?.label ?? pkg.areas.find(a => a.id === id)?.name ?? id;
  return { ...base, assetId: asset.id, assetName: asset.name, verification: asset.verificationStatus,
    connectionId: links.find(r => r.id === selection.connectionId)?.id,
    missingFields: documentationTasks(pkg, asset), electricalGaps, facts,
    requiredDocuments: required.length,
    documentationPercent: required.length ? Math.round(required.reduce((n, d) => n + weights[d.state], 0) / required.length * 100) : undefined,
    relationshipCount: links.length, verifiedRelationships: verified.length,
    upstreamCount: dependencies.filter(r => r.target === asset.id).length,
    downstreamCount: dependencies.filter(r => r.source === asset.id).length,
    evidenceCount: [...evidenceIds].filter(id => pkg.evidence.some(e => e.id === id)).length,
    disputedCount: facts.filter(f => f.state === 'DISPUTED').length + (asset.verificationStatus === 'DISPUTED' ? 1 : 0),
    links: links.map(r => ({ id: r.id, label: entityName(r.source) + ' → ' + entityName(r.target) + ' · ' + r.type, state: r.verificationStatus, evidenceCount: r.evidenceIds.length })),
  };
}
