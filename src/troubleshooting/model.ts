import { checks, symptoms, REVISION, restartFields, type Answer } from './catalog';
export type Outcome='unresolved'|'escalated'|'restored';
export interface Observation { answer:Answer; note:string; at:string; author:string; epoch:number }
export interface Session {
 id:string; facility_id:string; asset_id:string; created_by:string; version:number; updated_at:string;
 payload:{revision:string;symptom:string;intake:Record<string,string>;answers:Record<string,Observation>;epoch:number;recovery:Record<string,string>;recoveryKind:string;restart:Record<string,string>;outcome:Outcome;nextAction:string;responsible:string;isolation:string;actions:string;workId:string};
}
export interface SessionEvent {version:number;actor:string;at:string;action:string;payload:Session['payload']}
export interface Participant {user_id:string;accepted_at:string|null;invited_at:string}
export function initialPayload(symptom:string,intake:Record<string,string>):Session['payload']{
 if(!symptoms.some(s=>s.id===symptom))throw new Error('Choose a symptom.');
 return {revision:REVISION,symptom,intake,answers:{},epoch:0,recovery:{},recoveryKind:'reset',restart:{},outcome:'unresolved',nextAction:'Complete the next observation from outside guards.',responsible:'Unknown',isolation:'Unknown — recorded status is not a LOTO record',actions:'',workId:''};
}
export function nextCheck(p:Session['payload']):string|null {
 const path=symptoms.find(s=>s.id===p.symptom)?.path??[];
 return path.find(id=>!p.answers[id]||p.answers[id].epoch!==p.epoch||p.answers[id].answer!=='yes')??null;
}
export function currentAnswer(p:Session['payload'],id:string,now=Date.now()){
 const a=p.answers[id];return a&&a.epoch===p.epoch&&now-Date.parse(a.at)<=15*60*1000&&now>=Date.parse(a.at)?a:undefined;
}
export function unresolvedCheck(p:Session['payload'],now=Date.now()) {return (symptoms.find(s=>s.id===p.symptom)?.path??[]).find(id=>currentAnswer(p,id,now)?.answer!=='yes')??null;}
export function canRestore(p:Session['payload']) {return Object.keys(restartFields).every(k=>p.restart[k]==='yes');}
export type Telemetry={value:string;at:string;quality:'good'|'bad'|'uncertain'};
export function telemetryStatus(samples:Telemetry[],now=Date.now()){
 if(!samples.length)return 'missing';
 if(samples.some(s=>s.quality!=='good'||!Number.isFinite(Date.parse(s.at))||now-Date.parse(s.at)>60000||Date.parse(s.at)>now))return 'stale or uncertain';
 return new Set(samples.map(s=>s.value)).size>1?'conflicting':'current';
}
export function printable(s:Session,events:SessionEvent[]){
 const p=s.payload;
 return ['Industrial Asset Graph — troubleshooting / handoff','Draft—requires machine-side validation',`Asset: ${s.asset_id} · Session: ${s.id} · Version: ${s.version}`,`Logic/procedure revision: ${p.revision}`,`Symptom: ${symptoms.find(v=>v.id===p.symptom)?.label}`,`Outcome: ${p.outcome}`,...Object.entries(p.intake).map(([k,v])=>`${k}: ${v}`),'Saved logic is not live telemetry. No PLC connection.','Observations:',...Object.entries(p.answers).map(([k,a])=>`${checks[k]?.title??k}: ${a.answer} — ${a.note} · ${a.author} · ${a.at} · epoch ${a.epoch}`),`Actions and results: ${p.actions}`,`Recovery assessment: ${p.recoveryKind} — not validated; escalate`,JSON.stringify(p.recovery,null,2),`Next: ${p.nextAction} · Responsible: ${p.responsible}`,`Reported isolation: ${p.isolation} (not a substitute for site LOTO)`,`Restart verification: ${JSON.stringify(p.restart)}`,'Audit history:',...events.map(e=>`${e.at} · ${e.actor} · ${e.action} · version ${e.version}\n${JSON.stringify(e.payload)}`)].join('\n\n');
}
