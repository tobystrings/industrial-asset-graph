import type { FacilityPackage } from './types';

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

export interface PlantBackup {
  format: 'industrial-asset-graph';
  version: 1;
  exportedAt: string;
  plant: FacilityPackage;
  attachments: ExportAttachment[];
  observations: ObservationRecord[];
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
  const current = await loadPlant();
  const incoming = structuredClone(backup.plant);
  const mergeById = <T extends { id: string }>(left: T[], right: T[]) => {
    const map = new Map(left.map((item) => [item.id, item]));
    right.forEach((item) => map.set(item.id, item));
    return [...map.values()];
  };
  const next = mode === 'merge' && current ? {
    ...current,
    ...incoming,
    facility: { ...current.facility, ...incoming.facility },
    featureConfig: { ...current.featureConfig, ...incoming.featureConfig },
    mapConfig: { ...(current.mapConfig ?? {}), ...(incoming.mapConfig ?? {}) },
    areas: mergeById(current.areas, incoming.areas),
    assets: mergeById(current.assets, incoming.assets),
    components: mergeById(current.components, incoming.components),
    relationships: mergeById(current.relationships, incoming.relationships),
    documents: mergeById(current.documents, incoming.documents),
    evidence: mergeById(current.evidence, incoming.evidence),
    revisions: mergeById(current.revisions, incoming.revisions),
    assetSerialSources: mergeById(current.assetSerialSources, incoming.assetSerialSources),
  } : incoming;
  await savePlant(next);
  const db = await openPlantDb();
  const tx = db.transaction([ATTACHMENT_STORE, OBSERVATION_STORE], 'readwrite');
  if (mode === 'replace') {
    tx.objectStore(ATTACHMENT_STORE).clear();
    tx.objectStore(OBSERVATION_STORE).clear();
  }
  for (const attachment of backup.attachments ?? []) {
    const { dataUrl, ...metadata } = attachment;
    tx.objectStore(ATTACHMENT_STORE).put({ ...metadata, blob: dataUrlToBlob(dataUrl) });
  }
  for (const observation of backup.observations ?? []) tx.objectStore(OBSERVATION_STORE).put(observation);
  await transactionDone(tx);
  db.close();
  return next;
}
