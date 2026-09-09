import type { FacilityPackage } from './types';
import type { AttachmentRecord, ObservationRecord } from './runtimeDb';
import type { AuditEvent, PendingChange } from './changeControl';
import { validateFacilityPackage } from './schema';
import { validateHistory, type HistoryRecord } from './historicalEvidence';

export type PublishedAttachment = Omit<AttachmentRecord, 'blob'> & { url: string; sha256: string };
export interface Publication {
  format: 'iag-publication'; version: 1; facilityId: string;
  plant: FacilityPackage; attachments: PublishedAttachment[]; observations: ObservationRecord[];
  history: HistoryRecord[]; pending: PendingChange[]; audit: AuditEvent[];
  drafts?: Array<{id:string;facilityId:string;[key:string]:unknown}>;
}
export interface PublicationRow { facility_id: string; revision: number; payload: Publication; updated_at: string }
export interface PublicationConflict { path: string; base: unknown; local: unknown; shared: unknown }

export function canonicalJson(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  return JSON.stringify(value);
}

/** First-time migration cannot treat a record absent from an old browser seed as a deletion. */
export function initialPublicationBase(seed:Publication,local:Publication,deletedIds:ReadonlySet<string>=new Set()):Publication {
  function trim(b:unknown,l:unknown):unknown {
    if(Array.isArray(b)&&Array.isArray(l)&&b.every(x=>x&&typeof x==='object'&&typeof x.id==='string')) {
      const byId=new Map(l.filter(x=>x&&typeof x==='object').map(x=>[x.id,x]));
      return b.filter(x=>byId.has(x.id)||deletedIds.has(x.id)).map(x=>deletedIds.has(x.id)?x:trim(x,byId.get(x.id)));
    }
    if(b&&l&&typeof b==='object'&&typeof l==='object'&&!Array.isArray(b)&&!Array.isArray(l)) {
      const localObject=l as Record<string,unknown>;
      return Object.fromEntries(Object.entries(b).filter(([k])=>k in localObject).map(([k,v])=>[k,trim(v,localObject[k])]));
    }
    return b;
  }
  return trim(seed,local) as Publication;
}

/** Three-way merge. Concurrent edits to one field stop publication, never silently overwrite. */
export function mergePublication(base: Publication, local: Publication, shared: Publication) {
  if (base.facilityId !== local.facilityId || local.facilityId !== shared.facilityId) throw new Error('Publication facility mismatch.');
  const conflicts: PublicationConflict[] = [];
  const same = (a: unknown,b: unknown) => canonicalJson(a) === canonicalJson(b);
  function merge(b: unknown,l: unknown,r: unknown,path: string): unknown {
    if (same(l,r) || same(b,r)) return l;
    if (same(b,l)) return r;
    if (/^history\[[^\]]+\]$/.test(path) && l && r && typeof l==='object' && typeof r==='object' && (l as HistoryRecord).digest===(r as HistoryRecord).digest) {
      const left=l as HistoryRecord,right=r as HistoryRecord;
      return {...right,...left,publicSourceBase:right.publicSourceBase??left.publicSourceBase,reviews:[...new Map([...right.reviews,...left.reviews].map(review=>[canonicalJson(review),review])).values()]};
    }
    if (path === 'plant.packageRevision' || path.startsWith('plant.entityVersions.')) return Math.max(Number(l)||0,Number(r)||0);
    if (Array.isArray(l) && Array.isArray(r) && Array.isArray(b) && [...l,...r,...b].every(x => x && typeof x === 'object' && typeof x.id === 'string')) {
      const bm = new Map(b.map(x => [x.id,x])), lm = new Map(l.map(x => [x.id,x])), rm = new Map(r.map(x => [x.id,x]));
      return [...new Set([...rm.keys(),...lm.keys(),...bm.keys()])].map(id => merge(bm.get(id),lm.get(id),rm.get(id),`${path}[${id}]`)).filter(x => x !== undefined);
    }
    if (l && r && b && !Array.isArray(l) && !Array.isArray(r) && typeof l === 'object' && typeof r === 'object' && typeof b === 'object') {
      const bo=b as Record<string,unknown>,lo=l as Record<string,unknown>,ro=r as Record<string,unknown>;
      return Object.fromEntries([...new Set([...Object.keys(bo),...Object.keys(lo),...Object.keys(ro)])].map(k => [k,merge(bo[k],lo[k],ro[k],path ? `${path}.${k}` : k)]).filter(([,v]) => v !== undefined));
    }
    conflicts.push({path,base:b,local:l,shared:r}); return l;
  }
  return { payload: merge(base,local,shared,'') as Publication, conflicts };
}

export function validatePublication(p: Publication, facilityId: string) {
  if (p?.format !== 'iag-publication' || p.version !== 1 || p.facilityId !== facilityId || p.plant?.facility.id !== facilityId) throw new Error('Publication format or facility mismatch.');
  validateFacilityPackage(p.plant);
  for (const rows of [p.attachments,p.observations,p.history,p.pending,p.audit]) {
    if (!Array.isArray(rows) || rows.some(x => !x?.id) || new Set(rows.map(x=>x.id)).size !== rows.length) throw new Error('Invalid publication records.');
  }
  for (const h of p.history) { validateHistory(h.manifest,facilityId); if (h.facilityId !== facilityId) throw new Error('Historical facility mismatch.'); }
  for (const a of p.attachments) if (!/^[a-f0-9]{64}$/.test(a.sha256) || !Number.isSafeInteger(a.size) || a.size < 0 || !a.url.startsWith('https://')) throw new Error('Invalid published attachment.');
  for (const pending of p.pending) if (pending.next.facility.id !== facilityId) throw new Error('Proposal facility mismatch.');
  if(p.drafts?.some(d=>d.id!=='map-draft'||d.facilityId!==facilityId))throw new Error('Map draft facility mismatch.');
}

export function emptyPublication(plant: FacilityPackage): Publication {
  return {format:'iag-publication',version:1,facilityId:plant.facility.id,plant:structuredClone(plant),attachments:[],observations:[],history:[],pending:[],audit:[]};
}
