import type { FacilityPackage } from './types';
import type { FacilityAsset, RelationshipRecord, RelationshipType, VerificationState } from '../types/facility';

export type ImportRecord = { kind: 'asset'; value: FacilityAsset; action: 'create' | 'update'; row: number } | { kind: 'relationship'; value: RelationshipRecord; action: 'create' | 'update'; row: number };
export type ImportIssue = { row: number; message: string };
export type ImportPreview = { records: ImportRecord[]; creates: number; updates: number; unresolved: ImportIssue[]; duplicates: ImportIssue[]; errors: ImportIssue[] };

const relationshipTypes = new Set<RelationshipType>(['LOCATED_IN','CONTAINS','FEEDS','CONTROLS','SENSES','SUPPLIES','ISOLATES','INTERLOCKS_WITH','UPSTREAM_OF','DOWNSTREAM_OF','SENDS_DATA_TO','MECHANICALLY_DRIVES','HAS_DOCUMENT','SUPPORTED_BY_EVIDENCE']);
const verificationStates = new Set<VerificationState>(['VERIFIED','FIELD_VERIFY','INFERRED','DISPUTED','RETIRED']);

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && text[index + 1] === '\n') index += 1; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (quoted) throw new Error('CSV contains an unterminated quoted field.');
  return rows;
}

export function previewBulkImport(text: string, pkg: FacilityPackage, options: { acceptVerificationMetadata?: boolean } = {}): ImportPreview {
  const result: ImportPreview = { records: [], creates: 0, updates: 0, unresolved: [], duplicates: [], errors: [] };
  let rows: string[][];
  try { rows = parseCsv(text); } catch (error) { result.errors.push({ row: 0, message: error instanceof Error ? error.message : 'Unable to parse CSV.' }); return result; }
  if (rows.length < 2) { result.errors.push({ row: 0, message: 'CSV must include a header and at least one record.' }); return result; }
  const headers = rows[0].map((value) => value.toLowerCase());
  const required = ['recordtype', 'id'];
  for (const name of required) if (!headers.includes(name)) result.errors.push({ row: 1, message: `Missing required header: ${name}.` });
  if (result.errors.length) return result;
  const importedIds = new Set(rows.slice(1).map((values) => values[headers.indexOf('id')]?.trim()).filter(Boolean));
  const knownEntities = new Set([...pkg.areas, ...pkg.assets, ...pkg.components, ...pkg.documents, ...pkg.evidence].map((item) => item.id));
  importedIds.forEach((id) => knownEntities.add(id));
  const seen = new Set<string>();
  const field = (values: string[], name: string) => values[headers.indexOf(name)]?.trim() ?? '';
  for (let index = 1; index < rows.length; index += 1) {
    const values = rows[index], row = index + 1, kind = field(values, 'recordtype').toLowerCase(), id = field(values, 'id');
    if (!id) { result.errors.push({ row, message: 'Record ID is required.' }); continue; }
    if (seen.has(id)) { result.duplicates.push({ row, message: `Duplicate import ID: ${id}.` }); continue; }
    seen.add(id);
    const requestedStatus = field(values, 'verificationstatus').toUpperCase() as VerificationState;
    const verificationStatus: VerificationState = options.acceptVerificationMetadata && verificationStates.has(requestedStatus) ? requestedStatus : 'FIELD_VERIFY';
    const evidenceIds = field(values, 'evidenceids').split('|').map((value) => value.trim()).filter(Boolean);
    const missingEvidence = evidenceIds.filter((evidenceId) => !pkg.evidence.some((item) => item.id === evidenceId));
    if (missingEvidence.length) { result.unresolved.push({ row, message: `Unknown evidence reference(s): ${missingEvidence.join(', ')}.` }); continue; }
    if (kind === 'asset') {
      const existing = pkg.assets.find((item) => item.id === id);
      const name = field(values, 'name') || existing?.name || '';
      const areaId = field(values, 'areaid') || existing?.areaId || '';
      if (!name) { result.errors.push({ row, message: `Asset ${id} requires a name.` }); continue; }
      if (!pkg.areas.some((item) => item.id === areaId)) { result.unresolved.push({ row, message: `Asset ${id} references unknown area ${areaId || '(empty)'}.` }); continue; }
      const value: FacilityAsset = existing ? { ...existing, name, type: field(values, 'type') || existing.type, areaId, verificationStatus } : { id, name, description: '', type: field(values, 'type') || 'Field asset', facilityId: pkg.facility.id, areaId, line: field(values, 'line'), verificationStatus, manufacturer: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] }, model: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] }, serialNumber: { value: null, verificationStatus: 'FIELD_VERIFY', evidenceIds: [] }, facts: [], componentIds: [], unknowns: [] };
      result.records.push({ kind: 'asset', value, action: existing ? 'update' : 'create', row });
    } else if (kind === 'relationship') {
      const source = field(values, 'source'), target = field(values, 'target'), type = field(values, 'relationshiptype').toUpperCase() as RelationshipType;
      if (!relationshipTypes.has(type)) { result.errors.push({ row, message: `Relationship ${id} has invalid relationshipType.` }); continue; }
      if (verificationStatus === 'VERIFIED' && evidenceIds.length === 0) { result.errors.push({ row, message: `VERIFIED relationship ${id} requires evidenceIds.` }); continue; }
      if (!knownEntities.has(source) || !knownEntities.has(target)) { result.unresolved.push({ row, message: `Relationship ${id} has unresolved endpoint(s): ${source || '(empty)'} → ${target || '(empty)'}.` }); continue; }
      const existing = pkg.relationships.find((item) => item.id === id);
      result.records.push({ kind: 'relationship', value: { id, source, target, type, verificationStatus, evidenceIds }, action: existing ? 'update' : 'create', row });
    } else result.errors.push({ row, message: `Unsupported recordType '${kind || '(empty)'}'.` });
  }
  result.creates = result.records.filter((item) => item.action === 'create').length;
  result.updates = result.records.filter((item) => item.action === 'update').length;
  return result;
}
