import { sha256 } from '../facility/additivePackage';
import { supabase } from '../facility/supabaseAuth';
import { assertWork, type WorkRecord, type ReviewRecord, type ReviewProposal } from './model';
import { getWorkFile, readWork, updateWork } from './store';

export const workConnected=()=>Boolean(supabase);
const running=new Map<string,Promise<void>>();
export function syncWork(record:WorkRecord):Promise<void> {
  const key=record.facilityId+':'+record.id;if(running.has(key))return running.get(key)!;
  const run=(async()=>{
    if(!supabase)throw new Error('Shared repair storage is not configured. Work remains on this phone.');
    const existing=(await readWork(record.facilityId)).find(w=>w.id===record.id);
    if(existing?.transport==='received')return;
    if(existing?.transport==='conflict')throw new Error('Resolve the shared-version conflict before retrying.');
    let captured=await updateWork(record.facilityId,record.id,old=>({...old!,transport:'pending',error:undefined}));
    try {
      const files:WorkRecord['files']=[];
      for(const file of captured.files){
        const path=file.path??captured.facilityId+'/'+captured.authorId+'/'+captured.id+'/'+file.sha256;
        if(!file.path){const blob=await getWorkFile(captured.facilityId,file.id);if(!blob)throw new Error('Original attachment is missing: '+file.name);const {error}=await supabase.storage.from('iag-work').upload(path,blob,{contentType:file.type,upsert:false});if(error&&!/already exists|duplicate/i.test(error.message))throw new Error('Attachment upload failed: '+file.name+' · '+error.message);if(error){const original=await supabase.storage.from('iag-work').download(path);if(original.error||!original.data||await sha256(original.data)!==file.sha256)throw new Error('Stored original did not match this attachment: '+file.name);}}
        files.push({...file,path});
      }
      captured={...captured,files};
      const {data,error}=await supabase.rpc('iag_work_save',{p_id:captured.id,p_facility:captured.facilityId,p_base:captured.sharedVersion,p_request:captured.requestId,p_payload:captured});
      if(error)throw new Error(error.message);
      if(data.status==='conflict'){await updateWork(captured.facilityId,captured.id,old=>({...old!,transport:'conflict',error:'Another device saved this repair. Both versions are retained. Open the shared copy before choosing.'}));return;}
      await updateWork(captured.facilityId,captured.id,old=>({...old!,sharedVersion:data.version,files:old!.files.map(f=>files.find(u=>u.id===f.id)??f),transport:old!.version===captured.version?'received':'local',error:undefined}));
    }catch(e){await updateWork(captured.facilityId,captured.id,old=>({...old!,transport:'pending',error:e instanceof Error?e.message:String(e)}));throw e;}
  })();running.set(key,run);void run.finally(()=>running.delete(key)).catch(()=>undefined);return run;
}
export async function receiveWork(facilityId:string,authorId:string){
  if(!supabase)return;
  const {data,error}=await supabase.from('iag_work').select('*').eq('facility_id',facilityId).eq('author_id',authorId);if(error)throw new Error(error.message);
  for(const row of data??[]){assertWork(row.payload,facilityId);await updateWork(facilityId,row.id,old=>!old||old.transport==='received'?{...row.payload,sharedVersion:row.version,transport:'received'}:old);}
}
export async function sharedWork(facilityId:string,id:string):Promise<{payload:WorkRecord;version:number}>{
  if(!supabase)throw new Error('Shared storage is not configured.');const {data,error}=await supabase.from('iag_work').select('payload,version').eq('facility_id',facilityId).eq('id',id).single();if(error)throw new Error(error.message);assertWork(data.payload,facilityId);return data;
}
export async function submitWork(record:WorkRecord):Promise<string>{
  await syncWork(record);const current=(await readWork(record.facilityId)).find(w=>w.id===record.id)!;
  if(current.transport!=='received')throw new Error('Finish synchronizing this version before submitting.');
  const {data,error}=await supabase!.rpc('iag_work_submit',{p_id:current.id,p_version:current.sharedVersion});if(error)throw new Error(error.message);
  await updateWork(current.facilityId,current.id,old=>({...old!,submissionId:data.id}));return data.id;
}
export async function readInbox(facilityId:string):Promise<ReviewRecord[]>{
  if(!supabase)throw new Error('Shared Review Inbox is not configured. Local captures are retained.');
  const {data,error}=await supabase.from('iag_reviews').select('*').eq('facility_id',facilityId).order('created_at',{ascending:false});if(error)throw new Error(error.message);return data??[];
}
export async function reviewAction(row:ReviewRecord,action:'propose'|'clarify'|'reply'|'approve'|'reject'|'apply',proposal:ReviewProposal|null,text=''){
  if(!supabase)throw new Error('Shared storage is not configured.');
  const {data,error}=await supabase.rpc('iag_review_action',{p_id:row.id,p_version:row.version,p_action:action,p_proposal:proposal,p_text:text});if(error)throw new Error(error.message);return data as ReviewRecord;
}
export async function workFileUrl(path:string){
  if(!supabase)throw new Error('Sign in to open shared attachments.');const {data,error}=await supabase.storage.from('iag-work').createSignedUrl(path,300);if(error)throw new Error(error.message);return data.signedUrl;
}
