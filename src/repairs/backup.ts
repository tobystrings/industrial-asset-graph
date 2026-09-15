import { sha256 } from '../facility/additivePackage';
import { supabase } from '../facility/supabaseAuth';
import { assertWork, type WorkRecord } from './model';
import { getWorkFile, putWorkFile, readWork, updateWork } from './store';

interface WorkBackup {
  format: 'iag-work-backup'; version: 1; facilityId: string; authorId: string;
  records: WorkRecord[]; files: { id:string; type:string; sha256:string; base64:string }[];
}
function encode(bytes:Uint8Array) {
  let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(binary);
}
export async function originalFile(record:WorkRecord,file:WorkRecord['files'][number]):Promise<Blob> {
  let blob=await getWorkFile(record.facilityId,file.id);
  if(!blob&&file.path&&supabase){const result=await supabase.storage.from('iag-work').download(file.path);if(result.error)throw result.error;blob=result.data;}
  if(!blob||await sha256(blob)!==file.sha256)throw new Error('Original file is missing or its contents changed: '+file.name);
  return blob;
}
/** Includes original bytes; a metadata-only export must never masquerade as a backup. */
export async function exportWork(facilityId:string,authorId:string):Promise<WorkBackup> {
  const records=(await readWork(facilityId)).filter(w=>w.authorId===authorId);
  const files:WorkBackup['files']=[];
  for(const record of records)for(const file of record.files){if(files.some(f=>f.id===file.id))continue;const blob=await originalFile(record,file);files.push({id:file.id,type:file.type,sha256:file.sha256,base64:encode(new Uint8Array(await blob.arrayBuffer()))});}
  return {format:'iag-work-backup',version:1,facilityId,authorId,records,files};
}
export async function importWork(raw:unknown,facilityId:string,authorId:string) {
  const backup=raw as WorkBackup;
  if(backup?.format!=='iag-work-backup'||backup.version!==1||backup.facilityId!==facilityId||backup.authorId!==authorId||!Array.isArray(backup.records)||!Array.isArray(backup.files))throw new Error('Use a work backup from this facility and your signed-in account.');
  const blobs=new Map<string,Blob>();
  for(const w of backup.records){assertWork(w,facilityId);if(w.authorId!==authorId)throw new Error('Work belongs to another account.');}
  for(const f of backup.files){const bytes=Uint8Array.from(atob(f.base64),c=>c.charCodeAt(0));const blob=new Blob([bytes],{type:f.type});if(await sha256(blob)!==f.sha256)throw new Error('Backup original failed its integrity check.');blobs.set(f.id,blob);}
  for(const w of backup.records)for(const f of w.files){const blob=blobs.get(f.id);if(!blob||await sha256(blob)!==f.sha256)throw new Error('Backup is missing an original: '+f.name);}
  // Complete validation before writing anything. Existing drafts remain unchanged.
  const existing=await readWork(facilityId);let restored=0;
  for(const source of backup.records){
    const current=existing.find(w=>w.id===source.id);
    if(current&&JSON.stringify(current)===JSON.stringify(source))continue;
    const copy={...source,id:current?crypto.randomUUID():source.id,files:source.files.map(f=>({...f,id:crypto.randomUUID(),path:undefined})),sharedVersion:0,transport:'local' as const,error:undefined,requestId:crypto.randomUUID(),submissionId:undefined};
    for(let i=0;i<copy.files.length;i++)await putWorkFile(facilityId,copy.files[i].id,blobs.get(source.files[i].id)!);
    await updateWork(facilityId,copy.id,old=>old??copy);restored++;
  }
  return restored;
}
