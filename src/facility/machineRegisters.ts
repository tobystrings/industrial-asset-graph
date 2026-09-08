import type { DocumentRecord, RegisterEntry, VerificationState } from '../types/facility';
import type { AssetPackagePatch } from './additivePackage';

const states = new Set<VerificationState>(['VERIFIED', 'FIELD_VERIFY', 'INFERRED', 'DISPUTED', 'RETIRED']);
/** Convert recovered registers to native document records, retaining every raw field. */
export function mapMachineRegister(patch: AssetPackagePatch, assetId: string, kind: string, rows: Record<string, unknown>[], sourceDocument: DocumentRecord, section: string): DocumentRecord {
  const asset = patch.assets.find(a => a.id === assetId);
  if (!asset || sourceDocument.assetId !== assetId) throw new Error('Register asset/source mismatch.');
  const allowed = new Set([assetId, ...asset.componentIds]);
  const occurrences = new Map<string, number>();
  const entries: RegisterEntry[] = rows.map((values, index) => {
    const sourceId = typeof values.sourceId === 'string' ? values.sourceId : null;
    const evidenceIds = [...new Set([...sourceDocument.evidenceIds, ...(sourceId && patch.evidence.some(e => e.id === `ev-${sourceId}`) ? [`ev-${sourceId}`] : []), ...(Array.isArray(values.evidenceIds) ? values.evidenceIds.filter((id): id is string => typeof id === 'string' && patch.evidence.some(e => e.id === id)) : [])])];
    const references = [values.id, values.driveInstance, values.equipmentInstance, values.equipmentId, values.sourceId, values.destId, ...(Array.isArray(values.affectedRecords) ? values.affectedRecords : [])];
    const entityIds = [...new Set([assetId, ...references.filter((id): id is string => typeof id === 'string' && allowed.has(id))])];
    const label = String(values.title ?? values.label ?? values.claim ?? values.task ?? values.originalFilename ?? values.filename ?? values.file ?? (values.code ? `${values.code} = ${values.rawValue ?? 'Unknown'}` : values.wireId ? `Wire ${values.wireId} · terminal ${values.sourceTerminal ?? 'Unknown'}` : values.purpose ?? `${kind} ${index + 1}`));
    const identity = String(values.id ?? JSON.stringify([values.sourceId, values.snapshotId, values.code, values.locator, values.state, values.priority, values.filename, values.originalFilename, values.file, values.task, label]));
    const occurrence = (occurrences.get(identity) ?? 0) + 1;
    occurrences.set(identity, occurrence);
    return { id: `${assetId}:${kind}:${encodeURIComponent(identity)}:${occurrence}`, label, entityIds, evidenceIds,
      verificationStatus: states.has(values.verificationStatus as VerificationState) ? values.verificationStatus as VerificationState : 'FIELD_VERIFY',
      values: structuredClone(values), provenance: { filename: patch.documents.find(d => sourceId && d.evidenceIds.includes(`ev-${sourceId}`))?.title ?? (kind === 'maintenance-findings' ? sourceDocument.title : `${kind}.json`), section, review: 'INHERITED', sourceId, locator: typeof values.locator === 'string' ? values.locator : null } };
  });
  return { ...sourceDocument, id: `${assetId}-register-${kind}`, category: 'Machine registers', title: kind.replaceAll('-', ' '), register: { kind, entries } };
}
