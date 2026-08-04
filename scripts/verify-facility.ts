import { accessSync } from 'node:fs';
import { resolve } from 'node:path';
import { areas, components, documents, evidence, machines, relationships, revisions } from '../src/facilityData';

const verificationStates = new Set(['VERIFIED', 'FIELD_VERIFY', 'INFERRED', 'DISPUTED', 'RETIRED']);
const allRecords = [...areas, ...machines, ...components, ...documents, ...evidence, ...relationships, ...revisions];
const ids = allRecords.map((item) => item.id);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicateIds.length) throw new Error(`Duplicate IDs: ${[...new Set(duplicateIds)].join(', ')}`);

const entityIds = new Set([...areas, ...machines, ...components, ...documents, ...evidence].map((item) => item.id));
for (const relationship of relationships) {
  if (!entityIds.has(relationship.source) || !entityIds.has(relationship.target)) throw new Error(`Missing endpoint for ${relationship.id}: ${relationship.source} -> ${relationship.target}`);
  if (!verificationStates.has(relationship.verificationStatus)) throw new Error(`Invalid verification state on ${relationship.id}`);
}
const evidenceIds = new Set(evidence.map((item) => item.id));
const factRecords = machines.flatMap((machine) => [machine.manufacturer, machine.model, machine.serialNumber, ...machine.facts.map((item) => item.value)]);
for (const record of [...factRecords, ...components, ...documents, ...relationships, ...revisions]) {
  if ('verificationStatus' in record && !verificationStates.has(record.verificationStatus)) throw new Error('Invalid verification state.');
  for (const id of record.evidenceIds) if (!evidenceIds.has(id)) throw new Error(`Missing evidence reference: ${id}`);
}
for (const area of areas) {
  const { x, y, width, height } = area.overlay;
  if ([x, y, width, height].some((value) => !Number.isFinite(value)) || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 100 || y + height > 100) throw new Error(`Invalid overlay coordinates: ${area.id}`);
  for (const assetId of area.assetIds) if (!machines.some((machine) => machine.id === assetId && machine.areaId === area.id)) throw new Error(`Area/asset mismatch: ${area.id} -> ${assetId}`);
}
for (const machine of machines) if (!machine.id || !machine.name || !machine.type || !machine.facilityId || !machine.areaId || !machine.manufacturer.value || !machine.model.value) throw new Error(`Machine missing required identity fields: ${machine.id}`);
for (const revision of revisions) if (!revision.entityId || !revision.fieldPath || Number.isNaN(Date.parse(revision.changedAt)) || !revision.changedBy || !revision.reason) throw new Error(`Invalid revision: ${revision.id}`);

const parents = new Map(components.map((item) => [item.id, item.parentId]));
for (const start of parents.keys()) { const seen = new Set<string>(); let current: string | undefined = start; while (current && parents.has(current)) { if (seen.has(current)) throw new Error(`Hierarchy cycle at ${current}`); seen.add(current); current = parents.get(current); } }
for (const document of documents) {
  if (!document.path.endsWith('.md') || document.path.includes('..')) throw new Error(`Broken document path: ${document.path}`);
  const knownTemplate = ['overview', 'electrical', 'controls', 'pneumatics', 'mechanical', 'troubleshooting', 'pm', 'loto', 'parts', 'photos'].some((name) => document.path.endsWith(`/${name}.md`));
  if (!knownTemplate) throw new Error(`Unknown document path: ${document.path}`);
  accessSync(resolve(document.path));
}
accessSync(resolve('public/assets/labeled-building-layout.png'));
console.log(`Facility verified: ${areas.length} areas, ${machines.length} machine, ${components.length} components, ${documents.length} document categories, ${relationships.length} relationships.`);
