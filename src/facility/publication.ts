import type { FacilityPackage } from './types';
import { openPlantDb, type AttachmentRecord, type ObservationRecord } from './runtimeDb';
import { loadAuditEvents, loadPendingChanges, saveAuditEvents, savePendingChanges, type AuditEvent, type PendingChange } from './changeControl';
import { type HistoryRecord } from './historicalEvidence';
import { sha256 } from './additivePackage';
import { supabase } from './supabaseAuth';
import { loadWalkdownCaptures, replaceWalkdownCaptures } from '../lib/walkdown';

export { canonicalJson, emptyPublication, initialPublicationBase, mergePublication, validatePublication } from './publicationModel';
export type { Publication, PublicationConflict, PublicationRow, PublishedAttachment } from './publicationModel';
import { canonicalJson, validatePublication, type Publication, type PublicationRow, type PublishedAttachment } from './publicationModel';
export const publicationEnabled = import.meta.env.VITE_IAG_PUBLICATION === 'true';

async function rows<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve,reject) => { const r=db.transaction(store).objectStore(store).getAll(); r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error); });
}
/** Only explicit plant stores are exported. No session, password, token, or arbitrary localStorage. */
export async function capturePublication(plant: FacilityPackage, uploaded = new Map<string,PublishedAttachment>()): Promise<Publication> {
  const facilityId=plant.facility.id; const db=await openPlantDb(facilityId);
  try {
    const [attachments,observations,history,drafts]=await Promise.all([rows<AttachmentRecord>(db,'attachments'),rows<ObservationRecord>(db,'observations'),rows<HistoryRecord>(db,'historical-evidence'),rows<{id:string;facilityId:string;[key:string]:unknown}>(db,'publication-state').then(r=>r.filter(x=>x.id==='map-draft'))]);
    const published: PublishedAttachment[]=[];
    for (const a of attachments) {
      const digest=await sha256(a.blob); const key=`${a.id}:${digest}`;
      const cached=uploaded.get(key);
      if (cached) { const {blob:_,...metadata}=a; published.push({...cached,...metadata}); continue; }
      if (!supabase) throw new Error('Shared publication is not configured.');
      const actor=(await supabase.auth.getSession()).data.session?.user.id;
      if(!actor)throw new Error('Sign in before publishing files.');
      const path=`${facilityId}/${actor}/${digest}`;
      const {error}=await supabase.storage.from('iag-public').upload(path,a.blob,{contentType:a.mimeType,upsert:false});
      if (error && !/already exists|duplicate/i.test(error.message)) throw new Error(`File upload failed: ${a.name}: ${error.message}`);
      const {blob:_,...metadata}=a;
      const record={...metadata,url:supabase.storage.from('iag-public').getPublicUrl(path).data.publicUrl,sha256:digest};
      uploaded.set(key,record); published.push(record);
    }
    return {format:'iag-publication',version:1,facilityId,plant:structuredClone(plant),attachments:published,observations,history,pending:loadPendingChanges(facilityId),audit:loadAuditEvents(facilityId),drafts,walkdown:facilityId==='facility-j-lieb'?loadWalkdownCaptures():[]};
  } finally { db.close(); }
}

export async function readPublication(facilityId: string): Promise<PublicationRow | null> {
  if (!supabase) throw new Error('Shared publication is not configured.');
  const {data,error}=await supabase.from('iag_publications').select('*').eq('facility_id',facilityId).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) validatePublication(data.payload,facilityId);
  return data as PublicationRow | null;
}
export async function publishPublication(payload: Publication, baseRevision: number, requestId: string) {
  validatePublication(payload,payload.facilityId);
  if (!supabase) throw new Error('Shared publication is not configured.');
  const {data,error}=await supabase.rpc('iag_publish',{p_facility_id:payload.facilityId,p_base_revision:baseRevision,p_request_id:requestId,p_payload:payload});
  if (error) throw new Error(error.message);
  return data as {status:'saved'|'duplicate'|'conflict';revision:number;payload?:Publication};
}

export async function submitPublication(payload:Publication,userId:string) {
  validatePublication(payload,payload.facilityId);if(!supabase)throw new Error('Publication is not configured.');
  const {data:old,error:readError}=await supabase.from('iag_submissions').select('*').eq('facility_id',payload.facilityId).eq('submitted_by',userId).maybeSingle();
  if(readError)throw new Error(readError.message);
  if(old && canonicalJson(old.payload)===canonicalJson(payload))return;
  const {data,error}=await supabase.rpc('iag_submit',{p_facility_id:payload.facilityId,p_base_revision:old?.revision??0,p_request_id:crypto.randomUUID(),p_payload:payload});
  if(error)throw new Error(error.message);if(data.status==='conflict')throw new Error('Another device updated your proposal. Both local and shared copies are retained.');
}

export async function receiveSharedProposals(local:Publication) {
  if(!supabase)throw new Error('Publication is not configured.');
  const {data,error}=await supabase.from('iag_submissions').select('*').eq('facility_id',local.facilityId);
  if(error)throw new Error(error.message);
  const next=structuredClone(local);let count=0;
  for(const row of data??[]) {
    validatePublication(row.payload,local.facilityId);
    const auditId=`proposal-received:${row.submitted_by}:${row.revision}`;
    if(next.audit.some(a=>a.id===auditId))continue;
    for(const proposal of row.payload.pending as PendingChange[]) {
      if(next.pending.some(p=>p.id===proposal.id))continue;
      next.pending.push(proposal);count++;
    }
    for(const attachment of row.payload.attachments as PublishedAttachment[]) if(!next.attachments.some(a=>a.id===attachment.id))next.attachments.push(attachment);
    for(const observation of row.payload.observations as ObservationRecord[]) if(!next.observations.some(a=>a.id===observation.id))next.observations.push(observation);
    next.walkdown=[...new Map([...(row.payload.walkdown??[]),...(next.walkdown??[])].map(c=>[c.id,c])).values()];
    next.audit.push({id:auditId,actor:row.submitted_by,at:new Date().toISOString(),action:'Received shared proposal for review',detail:`Submission revision ${row.revision}; canonical plant unchanged.`});
  }
  await applyPublication(next);return {payload:next,count};
}

/** Download and verify every file before a single atomic local commit. */
export async function applyPublication(payload: Publication) {
  validatePublication(payload,payload.facilityId);
  const db=await openPlantDb(payload.facilityId);
  try {
    const old=new Map((await rows<AttachmentRecord>(db,'attachments')).map(a=>[a.id,a]));
    const attachments:AttachmentRecord[]=[];
    for (const a of payload.attachments) {
      let blob=old.get(a.id)?.blob;
      if (!blob || await sha256(blob)!==a.sha256) {
        const url=new URL(a.url); const configured=new URL(import.meta.env.VITE_SUPABASE_URL || a.url);
        if (url.origin!==configured.origin || !url.pathname.startsWith(`/storage/v1/object/public/iag-public/${payload.facilityId}/`)) throw new Error('Untrusted publication file location.');
        const response=await fetch(a.url); if (!response.ok) throw new Error(`Unable to receive ${a.name}.`); blob=await response.blob();
      }
      if (blob.size!==a.size || await sha256(blob)!==a.sha256) throw new Error(`Published file integrity mismatch: ${a.name}`);
      const {url:_,sha256:__,...metadata}=a; attachments.push({...metadata,blob:new Blob([blob],{type:a.mimeType})});
    }
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(['plant','attachments','observations','historical-evidence','publication-state'],'readwrite');
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
      tx.objectStore('plant').put(payload.plant,'active');
      tx.objectStore('publication-state').delete('map-draft');
      payload.drafts?.forEach(d=>tx.objectStore('publication-state').put(d));
      for (const [name,values] of [['attachments',attachments],['observations',payload.observations],['historical-evidence',payload.history]] as const) {
        const store=tx.objectStore(name);store.clear();values.forEach(v=>store.put(v));
      }
    });
    savePendingChanges(payload.facilityId,payload.pending);saveAuditEvents(payload.facilityId,payload.audit);
    if(payload.facilityId==='facility-j-lieb' && payload.walkdown)replaceWalkdownCaptures(payload.walkdown);
  } finally { db.close(); }
}
