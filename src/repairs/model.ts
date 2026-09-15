import type {RepairInterpretation} from '../../supabase/functions/_shared/repairAssistant';
export type WorkKind = 'repair' | 'note' | 'question' | 'correction' | 'app-change';
export interface WorkEntry { id: string; at: string; kind: 'note'|'measurement'|'check'|'change'|'parts'|'result'; text: string; }
export interface WorkFile { id: string; name: string; type: string; size: number; sha256: string; path?: string; }
export interface RepairSummary { problem: string; findings: string; work: string; outcome: string; remaining: string; }
export interface WorkRecord {
  id: string; facilityId: string; authorId: string; authorName: string; assetId: string;
  kind: WorkKind; createdAt: string; updatedAt: string; version: number; sharedVersion: number;
  state: 'open'|'finished'; transport: 'local'|'pending'|'received'|'conflict'; error?: string;
  note: string; entries: WorkEntry[]; files: WorkFile[]; summary: RepairSummary;
  submissionId?: string; requestId: string;
  ai?: RepairInterpretation & {generatedAt:string;inputVersion:number;sources:{id:string;title:string}[]};
}
export type Destination = 'repair'|'asset'|'inventory'|'document'|'app-change';
export interface ReviewProposal { destination: Destination; targetId: string; text: string; base: unknown; summary?: RepairSummary; }
export interface ReviewRecord {
  id: string; facility_id: string; author_id: string; created_at: string; version: number;
  original: WorkRecord; proposal: ReviewProposal | null;
  state: 'received'|'clarification'|'approved'|'applied'|'rejected';
  approved_by: string|null; approved_at: string|null; applied_by: string|null; applied_at: string|null;
  events: {at:string;actor:string;action:string;text:string}[]; application_revision?: number;
}
export function newWork(facilityId:string, authorId:string, authorName:string, assetId=''):WorkRecord {
  const at=new Date().toISOString();
  return {id:crypto.randomUUID(),facilityId,authorId,authorName,assetId,kind:assetId?'repair':'note',createdAt:at,updatedAt:at,version:1,sharedVersion:0,state:'open',transport:'local',note:'',entries:[],files:[],summary:{problem:'',findings:'',work:'',outcome:'',remaining:''},requestId:crypto.randomUUID()};
}
export function editedWork(record:WorkRecord, patch:Partial<WorkRecord>):WorkRecord {
  return {...record,...patch,version:record.version+1,updatedAt:new Date().toISOString(),transport:'local',error:undefined,requestId:crypto.randomUUID()};
}
export function draftSummary(record:WorkRecord):RepairSummary {
  const text=(...kinds:WorkEntry['kind'][])=>record.entries.filter(e=>kinds.includes(e.kind)).map(e=>e.text).join('\n');
  return {problem:record.summary.problem||record.entries.find(e=>e.kind==='note')?.text||record.note,findings:record.summary.findings||text('measurement','check'),work:record.summary.work||text('change','parts'),outcome:record.summary.outcome||text('result'),remaining:record.summary.remaining};
}
export function assertWork(value:unknown, facilityId:string):asserts value is WorkRecord {
  const w=value as WorkRecord;
  if(!w||w.facilityId!==facilityId||!w.id||!w.authorId||!Number.isInteger(w.version)||w.version<1||!Array.isArray(w.entries)||!Array.isArray(w.files)||!w.summary||typeof w.note!=='string')throw new Error('Invalid or cross-facility work record.');
  if(new Set(w.entries.map(e=>e.id)).size!==w.entries.length||new Set(w.files.map(f=>f.id)).size!==w.files.length)throw new Error('Duplicate work entry or attachment.');
  if(!['repair','note','question','correction','app-change'].includes(w.kind)||!['open','finished'].includes(w.state)||!['local','pending','received','conflict'].includes(w.transport)||!Number.isInteger(w.sharedVersion)||w.sharedVersion<0||typeof w.requestId!=='string'||typeof w.assetId!=='string'||typeof w.authorName!=='string'||!Number.isFinite(Date.parse(w.createdAt))||!Number.isFinite(Date.parse(w.updatedAt)))throw new Error('Invalid work metadata.');
  if(['problem','findings','work','outcome','remaining'].some(k=>typeof w.summary[k as keyof RepairSummary]!=='string'))throw new Error('Invalid repair summary.');
  if(w.entries.some(e=>!e.id||typeof e.text!=='string'||!e.at||!['note','measurement','check','change','parts','result'].includes(e.kind))||w.files.some(f=>!f.id||typeof f.name!=='string'||typeof f.type!=='string'||!Number.isFinite(f.size)||f.size<0||f.size>50*1024*1024||!/^[a-f0-9]{64}$/i.test(f.sha256)))throw new Error('Invalid work entry or attachment.');
}
