import type { FacilityPackage } from './types';
import { createStoredZip, readStoredZip } from './iagArchive';

const DB_NAME = 'industrial-asset-graph-runtime';
const DB_VERSION = 1;
const PLANT_STORE = 'plant';
const ATTACHMENT_STORE = 'attachments';
const OBSERVATION_STORE = 'observations';
const ACTIVE_KEY = 'active';

export interface AttachmentRecord {
  id: string;
  assetId: string;
  name: string;
  mimeType: string;
  size: number;
  blob: Blob;
  category: 'PHOTO' | 'PDF' | 'DRAWING' | 'OTHER';
  verificationStatus: 'VERIFIED' | 'FIELD_VERIFY';
  createdAt: string;
}

export interface ObservationRecord {
  id: string;
  assetId: string;
  text: string;
  verificationStatus: 'VERIFIED' | 'FIELD_VERIFY' | 'INFERRED' | 'DISPUTED';
  createdAt: string;
  createdBy: string;
}

type ExportAttachment = Omit<AttachmentRecord, 'blob'> & { dataUrl: string };
type ArchiveAttachment = Omit<AttachmentRecord, 'blob'> & { filePath: string };

export interface PlantBackup {
  format: 'industrial-asset-graph';
  version: 1;
  exportedAt: string;
  plant: FacilityPackage;
  attachments: ExportAttachment[];
  observations: ObservationRecord[];
}

export interface IagArchiveManifest {
  format: 'industrial-asset-graph';
  archiveVersion: 1;
  exportedAt: string;
  facilityId: string;
  facilityName: string;
  counts: {
    assets: number;
    areas: number;
    relationships: number;
    documents: number;
    evidence: number;
    attachments: number;
    observations: number;
  };
}

function requestAsPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export function openPlantDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PLANT_STORE)) db.createObjectStore(PLANT_STORE);
      if (!db.objectStoreNames.contains(ATTACHMENT_STORE)) {
        const store = db.createObjectStore(ATTACHMENT_STORE, { keyPath: 'id' });
        store.createIndex('assetId', 'assetId', { unique: false });
      }
      if (!db.objectStoreNames.contains(OBSERVATION_STORE)) {
        const store = db.createObjectStore(OBSERVATION_STORE, { keyPath: 'id' });
        store.createIndex('assetId', 'assetId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open plant database'));
  });
}

export async function ensurePlantSeed(seed: FacilityPackage): Promise<FacilityPackage> {
  const db = await openPlantDb();
  const tx = db.transaction(PLANT_STORE, 'readwrite');
  const store = tx.objectStore(PLANT_STORE);
  const existing = await requestAsPromise(store.get(ACTIVE_KEY)) as FacilityPackage | undefined;
  if (!existing) store.put(structuredClone(seed), ACTIVE_KEY);
  await transactionDone(tx);
  db.close();
  return existing ?? structuredClone(seed);
}

export async function loadPlant(): Promise<FacilityPackage | null> {
  const db = await openPlantDb();
  const tx = db.transaction(PLANT_STORE, 'readonly');
  const result = await requestAsPromise(tx.objectStore(PLANT_STORE).get(ACTIVE_KEY)) as FacilityPackage | undefined;
  await transactionDone(tx);
  db.close();
  return result ?? null;
}

export async function savePlant(pkg: FacilityPackage): Promise<void> {
  const db = await openPlantDb();
  const tx = db.transaction(PLANT_STORE, 'readwrite');
  tx.objectStore(PLANT_STORE).put(structuredClone(pkg), ACTIVE_KEY);
  await transactionDone(tx);
  db.close();
}

export async function resetPlant(seed: FacilityPackage): Promise<void> {
  const db = await openPlantDb();
  const tx = db.transaction([PLANT_STORE, ATTACHMENT_STORE, OBSERVATION_STORE], 'readwrite');
  tx.objectStore(PLANT_STORE).put(structuredClone(seed), ACTIVE_KEY);
  tx.objectStore(ATTACHMENT_STORE).clear();
  tx.objectStore(OBSERVATION_STORE).clear();
  await transactionDone(tx);
  db.close();
}

export async function putAttachment(record: AttachmentRecord): Promise<void> {
  const db = await openPlantDb();
  const tx = db.transaction(ATTACHMENT_STORE, 'readwrite');
  tx.objectStore(ATTACHMENT_STORE).put(record);
  await transactionDone(tx);
  db.close();
}

export async function deleteAttachment(id: string): Promise<void> {
  const db = await openPlantDb();
  const tx = db.transaction(ATTACHMENT_STORE, 'readwrite');
  tx.objectStore(ATTACHMENT_STORE).delete(id);
  await transactionDone(tx);
  db.close();
}

export async function listAttachments(assetId?: string): Promise<AttachmentRecord[]> {
  const db = await openPlantDb();
  const tx = db.transaction(ATTACHMENT_STORE, 'readonly');
  const store = tx.objectStore(ATTACHMENT_STORE);
  const request = assetId ? store.index('assetId').getAll(assetId) : store.getAll();
  const rows = await requestAsPromise(request) as AttachmentRecord[];
  await transactionDone(tx);
  db.close();
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAttachment(id: string): Promise<AttachmentRecord | null> {
  const db = await openPlantDb();
  const tx = db.transaction(ATTACHMENT_STORE, 'readonly');
  const row = await requestAsPromise(tx.objectStore(ATTACHMENT_STORE).get(id)) as AttachmentRecord | undefined;
  await transactionDone(tx);
  db.close();
  return row ?? null;
}

export async function putObservation(record: ObservationRecord): Promise<void> {
  const db = await openPlantDb();
  const tx = db.transaction(OBSERVATION_STORE, 'readwrite');
  tx.objectStore(OBSERVATION_STORE).put(record);
  await transactionDone(tx);
  db.close();
}

export async function listObservations(assetId?: string): Promise<ObservationRecord[]> {
  const db = await openPlantDb();
  const tx = db.transaction(OBSERVATION_STORE, 'readonly');
  const store = tx.objectStore(OBSERVATION_STORE);
  const request = assetId ? store.index('assetId').getAll(assetId) : store.getAll();
  const rows = await requestAsPromise(request) as ObservationRecord[];
  await transactionDone(tx);
  db.close();
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to encode attachment'));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',', 2);
  const mimeType = /data:([^;]+)/.exec(head)?.[1] ?? 'application/octet-stream';
  const binary = atob(body ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

function mergeById<T extends { id: string }>(left: T[], right: T[]) {
  const map = new Map(left.map((item) => [item.id, item]));
  right.forEach((item) => map.set(item.id, item));
  return [...map.values()];
}

function mergePlant(current: FacilityPackage | null, incoming: FacilityPackage, mode: 'replace' | 'merge'): FacilityPackage {
  if (mode !== 'merge' || !current) return structuredClone(incoming);
  return {
    ...current,
    ...incoming,
    facility: { ...current.facility, ...incoming.facility },
    featureConfig: { ...current.featureConfig, ...incoming.featureConfig },
    mapConfig: {
      ...(current.mapConfig ?? {}),
      ...(incoming.mapConfig ?? {}),
      markers: mergeById(current.mapConfig?.markers ?? [], incoming.mapConfig?.markers ?? []),
    },
    areas: mergeById(current.areas, incoming.areas),
    assets: mergeById(current.assets, incoming.assets),
    components: mergeById(current.components, incoming.components),
    relationships: mergeById(current.relationships, incoming.relationships),
    documents: mergeById(current.documents, incoming.documents),
    evidence: mergeById(current.evidence, incoming.evidence),
    revisions: mergeById(current.revisions, incoming.revisions),
    assetSerialSources: mergeById(current.assetSerialSources, incoming.assetSerialSources),
  };
}

async function applyImportedPlant(
  incoming: FacilityPackage,
  attachments: AttachmentRecord[],
  observations: ObservationRecord[],
  mode: 'replace' | 'merge',
): Promise<FacilityPackage> {
  const current = await loadPlant();
  const next = mergePlant(current, incoming, mode);
  await savePlant(next);
  const db = await openPlantDb();
  const tx = db.transaction([ATTACHMENT_STORE, OBSERVATION_STORE], 'readwrite');
  if (mode === 'replace') {
    tx.objectStore(ATTACHMENT_STORE).clear();
    tx.objectStore(OBSERVATION_STORE).clear();
  }
  for (const attachment of attachments) tx.objectStore(ATTACHMENT_STORE).put(attachment);
  for (const observation of observations) tx.objectStore(OBSERVATION_STORE).put(observation);
  await transactionDone(tx);
  db.close();
  return next;
}

export async function exportPlantBackup(): Promise<PlantBackup> {
  const plant = await loadPlant();
  if (!plant) throw new Error('No plant database is loaded');
  const [attachments, observations] = await Promise.all([listAttachments(), listObservations()]);
  const encoded: ExportAttachment[] = [];
  for (const attachment of attachments) {
    const { blob, ...metadata } = attachment;
    encoded.push({ ...metadata, dataUrl: await blobToDataUrl(blob) });
  }
  return {
    format: 'industrial-asset-graph',
    version: 1,
    exportedAt: new Date().toISOString(),
    plant,
    attachments: encoded,
    observations,
  };
}

export async function importPlantBackup(backup: PlantBackup, mode: 'replace' | 'merge'): Promise<FacilityPackage> {
  if (backup?.format !== 'industrial-asset-graph' || backup.version !== 1) throw new Error('Unsupported Industrial Asset Graph backup');
  const attachments: AttachmentRecord[] = (backup.attachments ?? []).map((attachment) => {
    const { dataUrl, ...metadata } = attachment;
    return { ...metadata, blob: dataUrlToBlob(dataUrl) };
  });
  return applyImportedPlant(structuredClone(backup.plant), attachments, backup.observations ?? [], mode);
}

function safeArchiveName(name: string) {
  return name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/^\.+/, '').slice(0, 140) || 'attachment';
}

export async function exportPlantArchive(): Promise<Blob> {
  const plant = await loadPlant();
  if (!plant) throw new Error('No plant database is loaded');
  const [attachments, observations] = await Promise.all([listAttachments(), listObservations()]);
  const exportedAt = new Date().toISOString();
  const metadata: ArchiveAttachment[] = attachments.map(({ blob: _blob, ...attachment }) => ({
    ...attachment,
    filePath: `files/${attachment.id}/${safeArchiveName(attachment.name)}`,
  }));
  const manifest: IagArchiveManifest = {
    format: 'industrial-asset-graph',
    archiveVersion: 1,
    exportedAt,
    facilityId: plant.facility.id,
    facilityName: plant.facility.name,
    counts: {
      assets: plant.assets.length,
      areas: plant.areas.length,
      relationships: plant.relationships.length,
      documents: plant.documents.length,
      evidence: plant.evidence.length,
      attachments: attachments.length,
      observations: observations.length,
    },
  };
  const entries: Array<{ name: string; data: string | Blob }> = [
    { name: 'manifest.json', data: JSON.stringify(manifest, null, 2) },
    { name: 'data/plant.json', data: JSON.stringify(plant) },
    { name: 'data/observations.json', data: JSON.stringify(observations) },
    { name: 'data/attachments.json', data: JSON.stringify(metadata) },
  ];
  metadata.forEach((row, index) => entries.push({ name: row.filePath, data: attachments[index].blob }));
  return createStoredZip(entries);
}

async function jsonEntry<T>(files: Map<string, Blob>, path: string): Promise<T> {
  const entry = files.get(path);
  if (!entry) throw new Error(`Invalid IAG archive: missing ${path}`);
  return JSON.parse(await entry.text()) as T;
}

export async function importPlantArchive(file: Blob, mode: 'replace' | 'merge'): Promise<FacilityPackage> {
  const files = await readStoredZip(file);
  const manifest = await jsonEntry<IagArchiveManifest>(files, 'manifest.json');
  if (manifest?.format !== 'industrial-asset-graph' || manifest.archiveVersion !== 1) throw new Error('Unsupported Industrial Asset Graph archive');
  const plant = await jsonEntry<FacilityPackage>(files, 'data/plant.json');
  const observations = files.has('data/observations.json') ? await jsonEntry<ObservationRecord[]>(files, 'data/observations.json') : [];
  const metadata = files.has('data/attachments.json') ? await jsonEntry<ArchiveAttachment[]>(files, 'data/attachments.json') : [];
  const attachments: AttachmentRecord[] = [];
  for (const row of metadata) {
    const entry = files.get(row.filePath);
    if (!entry) throw new Error(`Invalid IAG archive: missing attachment ${row.name}`);
    const { filePath: _filePath, ...record } = row;
    attachments.push({ ...record, blob: new Blob([await entry.arrayBuffer()], { type: row.mimeType }) });
  }
  return applyImportedPlant(plant, attachments, observations, mode);
}
