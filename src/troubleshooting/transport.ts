import { supabase } from '../facility/supabaseAuth';
import type { Session,SessionEvent,Participant } from './model';
function client(){if(!supabase)throw new Error('Shared troubleshooting storage is not configured. No shared session has been saved.');return supabase;}
export async function listSessions(facility:string,asset:string):Promise<Session[]>{const {data,error}=await client().from('iag_troubleshooting').select('*').eq('facility_id',facility).eq('asset_id',asset).order('updated_at',{ascending:false});if(error)throw Error(error.message);return data??[];}
export async function sessionHistory(id:string):Promise<SessionEvent[]>{const {data,error}=await client().from('iag_troubleshooting_events').select('*').eq('session_id',id).order('version');if(error)throw Error(error.message);return data??[];}
export async function participants(id:string):Promise<Participant[]>{const {data,error}=await client().from('iag_troubleshooting_members').select('user_id,accepted_at,invited_at').eq('session_id',id);if(error)throw Error(error.message);return data??[];}
export async function saveSession(id:string,facility:string,asset:string,base:number,action:string,payload:Session['payload'],request:string=crypto.randomUUID()):Promise<Session>{
 const {data,error}=await client().rpc('iag_troubleshooting_save',{p_id:id,p_facility:facility,p_asset:asset,p_base:base,p_action:action,p_payload:payload,p_request:request});
 if(error)throw Error(error.message);if(data.status==='conflict')throw Error('Another device changed this session. Reload and compare before saving your observations. Your form remains visible.');return data;
}
export async function inviteParticipant(id:string,email:string){const {error}=await client().rpc('iag_troubleshooting_invite',{p_id:id,p_email:email});if(error)throw Error(error.message);}
