import { areas, components, documents, machines } from '../facilityData';
import { ioSignals, productManuals } from '../productCatalog';
import { documentSource } from './documentCatalog';
import { faultCardFor } from './faultCard';
import { searchManuals } from './productLookup';
import { loadWalkdownCaptures } from './walkdown';
import { todayWalkdownItems } from './walkdownPrompts';

export type SearchHit = {
  id: string;
  kind: 'asset' | 'area' | 'document' | 'component' | 'film' | 'manual' | 'capture';
  title: string;
  subtitle: string;
  status?: string;
  assetId?: string;
  areaId?: string;
  documentId?: string;
  scene?: number;
};

export function buildSearchIndex(): SearchHit[] {
  const hits: SearchHit[] = [];
  for (const area of areas) {
    hits.push({ id: area.id, kind: 'area', title: area.name, subtitle: 'Area', status: area.status, areaId: area.id });
  }
  for (const asset of machines) {
    hits.push({ id: asset.id, kind: 'asset', title: asset.name, subtitle: asset.id, status: asset.verificationStatus, assetId: asset.id, areaId: asset.areaId });
  }
  for (const component of components) {
    hits.push({ id: component.id, kind: 'component', title: component.label, subtitle: `${component.type} · ${component.parentId}`, status: component.verificationStatus, assetId: component.parentId });
  }
  for (const document of documents) {
    hits.push({ id: document.id, kind: 'document', title: document.title, subtitle: document.category, status: document.state, assetId: document.assetId, documentId: document.id });
  }
  hits.push({ id: 'project-film', kind: 'film', title: 'Project film', subtitle: 'Narrated walkthrough · Tyler intro to Line 2', scene: 0 });
  for (const manual of productManuals) {
    hits.push({ id: manual.id, kind: 'manual', title: manual.title, subtitle: manual.excerpt, documentId: manual.id.startsWith('manual-pf4') ? 'doc-manual-pf4' : 'doc-manual-d700' });
  }
  return hits;
}

export function searchDocumentBodies(query: string): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return documents.flatMap((document) => {
    const body = documentSource(document.path);
    if (!body || !body.toLowerCase().includes(needle)) return [];
    return [{
      id: document.id,
      kind: 'document' as const,
      title: document.title,
      subtitle: document.category,
      status: document.state,
      assetId: document.assetId,
      documentId: document.id,
    }];
  });
}

function manualDocumentId(manualId: string): string {
  if (manualId.startsWith('manual-pf4')) return 'doc-manual-pf4';
  if (manualId.startsWith('manual-d700')) return 'doc-manual-d700';
  if (manualId.startsWith('manual-pf70')) return 'doc-manual-pf70';
  if (manualId.includes('servo')) return 'doc-manual-l4-servo';
  return manualId;
}

export function searchCatalog(query: string, index: SearchHit[] = buildSearchIndex()): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return index.slice(0, 12);
  const fromIndex = index.filter((hit) => `${hit.title} ${hit.subtitle} ${hit.id} ${hit.kind}`.toLowerCase().includes(needle));
  const manuals = searchManuals(needle).map((manual) => ({
    id: manual.id,
    kind: 'manual' as const,
    title: manual.title,
    subtitle: manual.excerpt,
    documentId: manualDocumentId(manual.id),
  }));
  const seen = new Set(fromIndex.map((item) => item.id));
  for (const hit of manuals) if (!seen.has(hit.id)) fromIndex.push(hit);
  for (const hit of searchDocumentBodies(needle)) if (!seen.has(hit.id)) {
    seen.add(hit.id);
    fromIndex.push(hit);
  }
  for (const signal of ioSignals) {
    const hay = `${signal.sourceTerminal} ${signal.purpose} dest-unknown ${signal.sourceId}`.toLowerCase();
    if (!hay.includes(needle) || seen.has(signal.id)) continue;
    seen.add(signal.id);
    fromIndex.push({
      id: signal.id,
      kind: 'component',
      title: `${signal.sourceId} ${signal.sourceTerminal}`,
      subtitle: `${signal.purpose} · dest-unknown`,
      status: 'FIELD_VERIFY',
      assetId: signal.sourceId.startsWith('L2-CC') ? 'L2-CC-001' : 'FG-L4-MTN-001',
    });
  }
  for (const item of todayWalkdownItems()) {
    const hay = `${item.label} ${item.kind} dest-unknown`.toLowerCase();
    if (!hay.includes(needle) || seen.has(item.id)) continue;
    seen.add(item.id);
    fromIndex.push({
      id: item.id,
      kind: item.kind === 'area-kit' ? 'area' : 'component',
      title: item.label,
      subtitle: item.kind,
      status: 'FIELD_VERIFY',
      assetId: item.assetId,
      areaId: item.kind === 'area-kit' ? item.id : undefined,
    });
  }
  for (const capture of loadWalkdownCaptures()) {
    const hay = `${capture.capturedBy} ${capture.targetId} ${capture.field} ${capture.value} capture`.toLowerCase();
    if (!hay.includes(needle) || seen.has(capture.id)) continue;
    seen.add(capture.id);
    fromIndex.push({
      id: capture.id,
      kind: 'capture',
      title: `${capture.capturedBy} · ${capture.targetId}`,
      subtitle: `${capture.field} · local capture`,
      status: 'FIELD_VERIFY',
      assetId: machines.find((item) => capture.targetId.startsWith(item.id))?.id,
    });
  }
  for (const component of components.filter((item) => item.type === 'VFD')) {
    const card = faultCardFor(component.id);
    const hay = `${card.message} fault dest-unknown ${component.id}`.toLowerCase();
    if (!hay.includes(needle) || seen.has(`fault-${component.id}`)) continue;
    seen.add(`fault-${component.id}`);
    fromIndex.push({
      id: component.id,
      kind: 'component',
      title: `${component.label} fault`,
      subtitle: card.message,
      status: 'FIELD_VERIFY',
      assetId: component.parentId,
    });
  }
  return fromIndex.sort((left, right) => gapScore(left) - gapScore(right)).slice(0, 20);
}

function gapScore(hit: SearchHit): number {
  const text = `${hit.title} ${hit.subtitle} ${hit.status ?? ''}`.toLowerCase();
  if (hit.status === 'FIELD_VERIFY' || text.includes('dest-unknown')) return 0;
  if (hit.kind === 'manual') return 1;
  if (hit.kind === 'film') return 3;
  return 2;
}
