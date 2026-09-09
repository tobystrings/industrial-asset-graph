import type { FacilityPackage } from './types';
import type { AttachmentRecord, ObservationRecord } from './runtimeDb';
import { openPlantDb, loadPlant, listAttachments, listObservations } from './runtimeDb';
import { validateFacilityPackage } from './schema';
import { createStoredZip, readStoredZip } from './iagArchive';

const collections = ['areas', 'assets', 'components', 'relationships', 'documents', 'evidence', 'revisions', 'assetSerialSources'] as const;
export type AssetPackagePatch = Pick<FacilityPackage, typeof collections[number]> & { facilityId: string; entityVersions: Record<string, number> };
export interface ImportConflict { collection: string; id: string; current: unknown; incoming: unknown }
export interface PrivateAssetBundle {
  format: 'industrial-asset-graph-private'; version: 1; patch: AssetPackagePatch;
  attachments: Array<Omit<AttachmentRecord, 'blob'> & { filePath: string; sha256: string }>;
  observations: ObservationRecord[];
}
const canonical = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);

export function mergeAssetPackage(current: FacilityPackage, patch: AssetPackagePatch) {
  if (patch.facilityId !== current.facility.id) throw new Error('Asset package belongs to a different facility.');
  const plant = structuredClone(current);
  const conflicts: ImportConflict[] = [];
  const added: string[] = [];
  const globalIds = new Set(collections.flatMap(key => current[key].map(row => row.id)));
  const incomingIds = new Set<string>();
  for (const key of collections) {
    if (!Array.isArray(patch[key])) throw new Error(`Missing asset package collection: ${key}`);
    const existing = new Map<string, { id: string }>(current[key].map(row => [row.id, row]));
    for (const row of patch[key]) {
      if (!row.id || incomingIds.has(row.id)) throw new Error(`Duplicate package ID: ${row.id}`);
      incomingIds.add(row.id);
      const old = existing.get(row.id);
      if (old) {
        if (canonical(old) !== canonical(row)) conflicts.push({ collection: key, id: row.id, current: old, incoming: row });
      } else {
        if (globalIds.has(row.id)) throw new Error(`Package ID changes entity type: ${row.id}`);
        (plant[key] as Array<{ id: string }>).push(structuredClone(row));
        plant.entityVersions[row.id] = patch.entityVersions?.[row.id] ?? 1;
        globalIds.add(row.id); added.push(row.id);
      }
    }
  }
  if (added.length) plant.packageRevision += 1;
  validateFacilityPackage(plant);
  return { plant, conflicts, added };
}

export async function sha256(blob: Blob): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(value => value.toString(16).padStart(2, '0')).join('');
}

export async function readPrivateAssetBundle(file: Blob) {
  const files = await readStoredZip(file);
  const entry = files.get('private-manifest.json');
  if (!entry) throw new Error('Not a private asset bundle (private-manifest.json missing).');
  const manifest = JSON.parse(await entry.text()) as PrivateAssetBundle;
  if (manifest.format !== 'industrial-asset-graph-private' || manifest.version !== 1) throw new Error('Unsupported private asset bundle.');
  const attachments: AttachmentRecord[] = [];
  const ids = new Set<string>();
  for (const row of manifest.attachments) {
    if (ids.has(row.id)) throw new Error(`Duplicate attachment: ${row.id}`);
    ids.add(row.id);
    const blob = files.get(row.filePath);
    if (!blob || blob.size !== row.size || await sha256(blob) !== row.sha256) throw new Error(`Attachment integrity failed: ${row.name}`);
    if (!['LOCAL_ONLY', 'RESTRICTED'].includes(row.access)) throw new Error('Private bundle attachments must remain controlled.');
    const { filePath: _path, sha256: _hash, ...record } = row;
    attachments.push({ ...record, blob: new Blob([await blob.arrayBuffer()], { type: record.mimeType }) });
  }
  return { manifest, attachments };
}

/** Deliberately private recovery artifact. Never called by portable export. */
export async function exportPrivateRecovery(facilityId: string): Promise<Blob> {
  const plant = await loadPlant(facilityId);
  if (!plant) throw new Error('No local facility loaded.');
  const db = await openPlantDb(facilityId);
  const names = [...db.objectStoreNames].filter(name => name !== 'publication-state');
  const tx = db.transaction(names, 'readonly');
  const stores: Record<string, { keys: IDBValidKey[]; values: unknown[] }> = {};
  await Promise.all(names.map(name => new Promise<void>((resolve, reject) => {
    const store = tx.objectStore(name); const keys = store.getAllKeys(); const values = store.getAll();
    values.onsuccess = () => { stores[name] = { keys: keys.result, values: values.result }; resolve(); };
    values.onerror = () => reject(values.error);
  })));
  db.close();
  const entries: Array<{ name: string; data: string | Blob }> = [];
  for (const row of stores.attachments?.values ?? []) {
    const attachment = row as AttachmentRecord;
    entries.push({ name: `files/${attachment.id}`, data: attachment.blob });
    (row as Record<string, unknown>).blob = { privateFile: `files/${attachment.id}`, sha256: await sha256(attachment.blob) };
  }
  entries.push({ name: 'recovery.json', data: JSON.stringify({ format: 'industrial-asset-graph-private-recovery', version: 1, facilityId, createdAt: new Date().toISOString(), stores }) });
  return createStoredZip(entries);
}

/** Explicit rollback only. Validate the entire backup before replacing any local store. */
export async function restorePrivateRecovery(file: Blob, facilityId: string): Promise<void> {
  const stores = await verifyPrivateRecovery(file, facilityId);
  const db = await openPlantDb(facilityId);
  try {
    const names = [...db.objectStoreNames];
    // Recovery files created before the historical ledger restore an empty ledger.
    if (!stores['historical-evidence']) stores['historical-evidence'] = { keys: [], values: [] };
    if (!stores['publication-state']) stores['publication-state'] = { keys: [], values: [] };
    if (names.length !== Object.keys(stores).length || names.some(name => !stores[name] || stores[name].keys.length !== stores[name].values.length)) throw new Error('Recovery store layout mismatch.');
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(names, 'readwrite');
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error ?? new Error('Recovery aborted.')); tx.onerror = () => reject(tx.error);
      try {
        for (const name of names) {
          const store = tx.objectStore(name); store.clear();
          stores[name].values.forEach((value, i) => store.keyPath === null ? store.put(value, stores[name].keys[i]) : store.put(value));
        }
      } catch (error) { tx.abort(); reject(error); }
    });
  } finally { db.close(); }
}

/** Read back and verify recovery bytes without mutating any facility. */
export async function verifyPrivateRecovery(file: Blob, facilityId: string) {
  const files = await readStoredZip(file);
  const entry = files.get('recovery.json');
  if (!entry) throw new Error('Private recovery manifest missing.');
  const data = JSON.parse(await entry.text());
  if (data.format !== 'industrial-asset-graph-private-recovery' || data.version !== 1 || data.facilityId !== facilityId) throw new Error('Recovery format or facility mismatch.');
  const stores = data.stores as Record<string, { keys: IDBValidKey[]; values: unknown[] }>;
  const plantIndex = stores.plant?.keys.indexOf('active');
  const plant = plantIndex !== undefined && plantIndex >= 0 ? stores.plant.values[plantIndex] as FacilityPackage : undefined;
  if (!plant || plant.facility.id !== facilityId) throw new Error('Recovery plant missing or mismatched.');
  validateFacilityPackage(plant);
  for (const row of stores.attachments?.values ?? []) {
    const attachment = row as Omit<AttachmentRecord, 'blob'> & { blob: { privateFile: string; sha256: string } };
    const blob = files.get(attachment.blob.privateFile);
    if (!blob || blob.size !== attachment.size || await sha256(blob) !== attachment.blob.sha256) throw new Error(`Recovery attachment integrity failed: ${attachment.id}`);
    (row as AttachmentRecord).blob = new Blob([await blob.arrayBuffer()], { type: attachment.mimeType });
  }
  if (Object.values(stores).some(store => !Array.isArray(store.keys) || !Array.isArray(store.values) || store.keys.length !== store.values.length)) throw new Error('Recovery store layout mismatch.');
  if (stores['historical-evidence']?.values.length) {
    const { validateHistory, historyFileId } = await import('./historicalEvidence');
    for (const value of stores['historical-evidence'].values) {
      const record = value as import('./historicalEvidence').HistoryRecord;
      validateHistory(record.manifest, facilityId);
      if (record.facilityId !== facilityId || record.id !== record.manifest.id || !Array.isArray(record.reviews)) throw new Error('Historical recovery identity mismatch.');
      for (const file of record.manifest.files) {
        const attachment = stores.attachments.values.find(v => (v as AttachmentRecord).id === historyFileId(record.id, file)) as AttachmentRecord | undefined;
        if (!attachment && record.publicSourceBase === 'facility-content/lieb-foods/recovered-2026-09-08/J_Lieb_Plant_Codex_Handoff/' && facilityId === 'facility-j-lieb') continue;
        if (!attachment || attachment.assetId !== `history:${record.id}` || attachment.access !== 'LOCAL_ONLY' || attachment.size !== file.size || await sha256(attachment.blob) !== file.sha256) throw new Error('Historical recovery source mismatch.');
      }
    }
  }
  return stores;
}

/** Add only missing IDs. Existing values and pending mutations remain unchanged. */
export async function importPrivateAssetBundle(file: Blob, facilityId: string) {
  const { manifest, attachments } = await readPrivateAssetBundle(file);
  const current = await loadPlant(facilityId);
  if (!current) throw new Error('No local facility loaded.');
  const result = mergeAssetPackage(current, manifest.patch);
  const [oldAttachments, oldObservations] = await Promise.all([listAttachments(undefined, facilityId), listObservations(undefined, facilityId)]);
  const existingAttachments = new Map(oldAttachments.map(row => [row.id, row]));
  const attachmentAdds: AttachmentRecord[] = [];
  for (const row of attachments) {
    if (!result.plant.assets.some(asset => asset.id === row.assetId)) throw new Error(`Attachment has missing asset: ${row.id}`);
    const old = existingAttachments.get(row.id);
    if (!old) attachmentAdds.push(row);
    else if (old.assetId !== row.assetId || old.access !== row.access || await sha256(old.blob) !== await sha256(row.blob)) result.conflicts.push({ collection: 'attachments', id: row.id, current: { ...old, blob: undefined }, incoming: { ...row, blob: undefined } });
  }
  const obsIds = new Set<string>();
  const observationAdds: ObservationRecord[] = [];
  for (const row of manifest.observations) {
    if (obsIds.has(row.id) || !result.plant.assets.some(asset => asset.id === row.assetId)) throw new Error(`Invalid observation: ${row.id}`);
    obsIds.add(row.id);
    const old = oldObservations.find(item => item.id === row.id);
    if (!old) observationAdds.push(row);
    else if (canonical(old) !== canonical(row)) result.conflicts.push({ collection: 'observations', id: row.id, current: old, incoming: row });
  }
  const attachmentIds = new Set([...oldAttachments, ...attachmentAdds].map(row => row.id));
  for (const row of attachmentAdds) if (row.previewAttachmentId) {
    const preview = [...oldAttachments, ...attachmentAdds].find(item => item.id === row.previewAttachmentId);
    if (!preview || preview.assetId !== row.assetId || preview.access !== row.access || !preview.mimeType.startsWith('image/')) throw new Error(`Invalid controlled preview: ${row.id}`);
  }
  for (const doc of manifest.patch.documents) if (doc.path.startsWith('indexeddb://attachment/')) {
    const id = doc.path.slice('indexeddb://attachment/'.length);
    if (!attachmentIds.has(id)) throw new Error(`Missing local document attachment: ${doc.id}`);
    if (![...oldAttachments, ...attachmentAdds].some(row => row.id === id && row.assetId === doc.assetId)) throw new Error(`Document attachment belongs to another asset: ${doc.id}`);
  }
  const db = await openPlantDb(facilityId);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['plant', 'attachments', 'observations'], 'readwrite');
    const check = tx.objectStore('plant').get('active');
    check.onsuccess = () => {
      if (canonical(check.result) !== canonical(current)) { tx.abort(); return; }
      tx.objectStore('plant').put(result.plant, 'active');
      attachmentAdds.forEach(row => tx.objectStore('attachments').add(row));
      observationAdds.forEach(row => tx.objectStore('observations').add(row));
    };
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(new Error('Import cancelled because local data changed. Retry with a fresh backup.'));
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return { ...result, attachmentsAdded: attachmentAdds.length, observationsAdded: observationAdds.length };
}
