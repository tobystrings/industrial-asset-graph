import { openPlantDb, type AttachmentRecord } from './runtimeDb';
import { readStoredZip } from './iagArchive';
import { sha256 } from './additivePackage';
import type { IagUser } from './changeControl';

export const assertionKinds = ['OEM_REQUIREMENT', 'USER_OBSERVATION', 'HISTORICAL_SNAPSHOT', 'GENERATED_ILLUSTRATION', 'PROPOSAL', 'REPORTED_COMPLETION', 'SECONDARY_SUMMARY', 'CORRECTION'] as const;
export interface HistoryFile { path: string; sha256: string; size: number; mimeType: string; incomplete: boolean }
export interface HistorySource { id: string; name: string; paths: string[]; coverage: string }
export interface HistoryAssertion {
  id: string; subject: string; kind: typeof assertionKinds[number]; text: string;
  values?: Record<string, unknown>; verification: 'FIELD_VERIFY' | 'DISPUTED';
  citations: { sourceId: string; locator: string }[];
}
export interface HistoryTask { id: string; subject: string; priority: 1 | 2 | 3; action: string; assertionIds: string[] }
export interface HistoryManifest {
  format: 'industrial-asset-graph-history'; version: 1; id: string; facilityId: string; title: string; access: 'LOCAL_ONLY';
  subjects: { id: string; name: string; candidateAssetId?: string; priority: 1 | 2 | 3; lineContext: string }[];
  sources: HistorySource[]; files: HistoryFile[]; assertions: HistoryAssertion[]; tasks: HistoryTask[];
}
export interface HistoryReview { assertionId: string; state: 'REVIEWED' | 'REJECTED' | 'PENDING'; note: string; actor: string; at: string }
export interface HistoryRecord { id: string; facilityId: string; digest: string; manifest: HistoryManifest; importedAt: string; importedBy: string; reviews: HistoryReview[]; publicSourceBase?: string }
export interface HistoryBundle { manifest: HistoryManifest; digest: string; files: Map<string, Blob> }
const storeName = 'historical-evidence';
function authorize(user: IagUser | null, admin = false) {
  if (!user?.id || !['admin', 'technician'].includes(user.role) || (admin && user.role !== 'admin')) throw new Error(admin ? 'An administrator must review historical assertions.' : 'Sign in to access local historical evidence.');
}
function unique(rows: { id: string }[]) {
  if (!Array.isArray(rows) || rows.some(r => !r || typeof r.id !== 'string' || !r.id.trim()) || new Set(rows.map(r => r.id)).size !== rows.length) throw new Error('Missing or duplicate historical ID.');
}
export function validateHistory(m: HistoryManifest, facilityId: string) {
  if (m?.format !== 'industrial-asset-graph-history' || m.version !== 1 || m.facilityId !== facilityId || m.access !== 'LOCAL_ONLY' || !/^[a-zA-Z0-9_-]+$/.test(m.id)) throw new Error('Historical format, access or facility mismatch.');
  [m.subjects, m.sources, m.assertions, m.tasks].forEach(unique);
  if (!Array.isArray(m.files) || new Set(m.files.map(f => f.path)).size !== m.files.length || m.files.some(f => !f.path || f.path.startsWith('/') || f.path.includes('\\') || f.path.split('/').includes('..') || !/^[a-f0-9]{64}$/.test(f.sha256) || !Number.isSafeInteger(f.size) || f.size < 0 || typeof f.incomplete !== 'boolean')) throw new Error('Invalid historical file manifest.');
  const paths = new Set(m.files.map(f => f.path)); const subjects = new Set(m.subjects.map(s => s.id)); const sources = new Set(m.sources.map(s => s.id));
  if (m.subjects.some(s => !s.name || ![1, 2, 3].includes(s.priority) || !s.lineContext)) throw new Error('Invalid historical subject.');
  if (m.sources.some(s => !s.name || !s.coverage || !Array.isArray(s.paths) || !s.paths.length || s.paths.some(p => !paths.has(p)) || s.paths.every(p => m.files.find(f => f.path === p)?.incomplete))) throw new Error('Historical source has no intact evidence.');
  if (m.assertions.some(a => !subjects.has(a.subject) || !assertionKinds.includes(a.kind) || !['FIELD_VERIFY', 'DISPUTED'].includes(a.verification) || !a.text || !Array.isArray(a.citations) || !a.citations.length || a.citations.some(c => !sources.has(c.sourceId) || !c.locator))) throw new Error('Invalid or unsourced historical assertion.');
  const assertions = new Set(m.assertions.map(a => a.id));
  if (m.tasks.some(t => !subjects.has(t.subject) || ![1, 2, 3].includes(t.priority) || !t.action || !Array.isArray(t.assertionIds) || !t.assertionIds.length || t.assertionIds.some(id => !assertions.has(id)))) throw new Error('Invalid or unsourced verification task.');
}
export async function readHistoryBundle(blob: Blob, facilityId: string): Promise<HistoryBundle> {
  const files = await readStoredZip(blob); const json = files.get('history.json');
  if (!json) throw new Error('Select a prepared historical evidence bundle (history.json missing).');
  const manifest = JSON.parse(await json.text()) as HistoryManifest; validateHistory(manifest, facilityId);
  if (files.size !== manifest.files.length + 1) throw new Error('Unexpected files in historical bundle.');
  for (const f of manifest.files) { const data = files.get(f.path); if (!data || data.size !== f.size || await sha256(data) !== f.sha256) throw new Error(`Historical source integrity failed: ${f.path}`); }
  return { manifest, files, digest: await sha256(json) };
}
export async function listHistory(facilityId: string, user: IagUser | null): Promise<HistoryRecord[]> {
  authorize(user); const db = await openPlantDb(facilityId);
  try { return await new Promise((resolve, reject) => { const request = db.transaction(storeName).objectStore(storeName).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); } finally { db.close(); }
}
export function historyFileId(batchId: string, f: HistoryFile) { return `history-${batchId}-${f.sha256}`; }
/** Revalidate bytes at commit; all ledger and attachment writes commit atomically. Canonical plant is never written. */
export async function importHistory(blob: Blob, facilityId: string, user: IagUser | null) {
  authorize(user); const { manifest, digest, files } = await readHistoryBundle(blob, facilityId); const db = await openPlantDb(facilityId);
  try { return await new Promise<'ADDED' | 'UNCHANGED'>((resolve, reject) => {
    const tx = db.transaction(['plant', storeName, 'attachments'], 'readwrite'); let result: 'ADDED' | 'UNCHANGED' = 'UNCHANGED'; let failure = 'Historical import aborted.';
    tx.oncomplete = () => resolve(result); tx.onabort = () => reject(new Error(failure)); tx.onerror = () => reject(tx.error);
    const plant = tx.objectStore('plant').get('active');
    plant.onsuccess = () => {
      if (plant.result?.facility.id !== facilityId) { failure = 'Load the matching facility before importing.'; tx.abort(); return; }
      const store = tx.objectStore(storeName); const old = store.get(manifest.id);
      old.onsuccess = () => {
        if (old.result) { if (old.result.digest !== digest) { failure = 'Batch ID conflict: existing history preserved. Use a new batch ID for a source revision.'; tx.abort(); } return; }
        const at = new Date().toISOString();
        store.add({ id: manifest.id, facilityId, digest, manifest, importedAt: at, importedBy: user!.id, reviews: [] } satisfies HistoryRecord);
        // Same bytes under several source paths share a single immutable attachment.
        const added = new Set<string>();
        for (const f of manifest.files) {
          const id = historyFileId(manifest.id, f); if (added.has(id)) continue; added.add(id);
          tx.objectStore('attachments').add({ id, assetId: `history:${manifest.id}`, name: f.path, size: f.size, mimeType: f.mimeType, blob: files.get(f.path)!, category: 'OTHER', verificationStatus: 'FIELD_VERIFY', access: 'LOCAL_ONLY', createdAt: at } satisfies AttachmentRecord);
        }
        result = 'ADDED';
      };
    };
  }); } finally { db.close(); }
}
export async function reviewHistory(facilityId: string, batchId: string, review: Omit<HistoryReview, 'actor' | 'at'>, user: IagUser | null) {
  authorize(user, true); if (!['REVIEWED', 'REJECTED', 'PENDING'].includes(review.state) || !review.note.trim()) throw new Error('Review requires a state and rationale.');
  const db = await openPlantDb(facilityId);
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite'); tx.oncomplete = () => resolve(); tx.onabort = () => reject(new Error('Unknown historical assertion.')); tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(storeName); const request = store.get(batchId);
    request.onsuccess = () => { const record = request.result as HistoryRecord; if (!record || record.facilityId !== facilityId || !record.manifest.assertions.some(a => a.id === review.assertionId)) { tx.abort(); return; } record.reviews.push({ ...review, actor: user!.id, at: new Date().toISOString() }); store.put(record); };
  }); } finally { db.close(); }
}

export async function seedPublishedHistory(facilityId: string): Promise<void> {
  if (facilityId !== 'facility-j-lieb') return;
  const response = await fetch(`${import.meta.env.BASE_URL}facility-content/lieb-foods/history.json`);
  if (!response.ok) return;
  const manifest = await response.json() as HistoryManifest;
  validateHistory(manifest, facilityId);
  const db = await openPlantDb(facilityId);
  try { await new Promise<void>((resolve,reject) => {
    const tx=db.transaction('historical-evidence','readwrite'); const store=tx.objectStore('historical-evidence');const request=store.get(manifest.id);
    request.onsuccess=()=>{ const existing = request.result as HistoryRecord | undefined; const publicSourceBase = 'facility-content/lieb-foods/recovered-2026-09-08/J_Lieb_Plant_Codex_Handoff/'; if(!existing) store.add({id:manifest.id,facilityId,digest:(manifest as HistoryManifest & {publication:{originalDigest:string}}).publication.originalDigest,manifest,importedAt:'2026-09-09T00:00:00Z',importedBy:'Owner-authorized GitHub publication',reviews:[],publicSourceBase}); else if(!existing.publicSourceBase) store.put({...existing,publicSourceBase}); };
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
  }); } finally { db.close(); }
}
