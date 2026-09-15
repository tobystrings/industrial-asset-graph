import { useEffect, useRef, useState } from 'react';
import { useFacility, useFacilityEditor } from '../facility';
import { PageLink } from '../navigation/AppShell';
import { checks, symptoms, DRAFT, REVISION, evidence, intakeFields, recoveryFields, recoveryKinds, recoveryExplanations, recoveryStatus, restartFields, type Answer } from './catalog';
import { initialPayload, currentAnswer, unresolvedCheck, canRestore, printable, type Session, type SessionEvent, type Participant } from './model';
import { listSessions, saveSession, sessionHistory, participants, inviteParticipant } from './transport';
import './troubleshooting.css';

const labelAnswer={yes:'Yes',no:'No',unknown:'Not sure'};
export default function Troubleshooting({assetId}:{assetId:string}){
 const pkg=useFacility(),{currentUser:user}=useFacilityEditor();
 const [sessions,setSessions]=useState<Session[]>([]),[session,setSession]=useState<Session|null>(null),[draft,setDraft]=useState<Session['payload']|null>(null);
 const [events,setEvents]=useState<SessionEvent[]>([]),[members,setMembers]=useState<Participant[]>([]);
 const [symptom,setSymptom]=useState('nothing'),[intake,setIntake]=useState<Record<string,string>>({role:'operator'}),[note,setNote]=useState(''),[email,setEmail]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState(''),[selected,setSelected]=useState<string|null>(null),[panel,setPanel]=useState<'checks'|'recovery'|'handoff'|'outcome'>('checks');
 const [clock,setClock]=useState(Date.now());
 const requested=new URLSearchParams(location.search).get('session');
 const [createId]=useState(()=>crypto.randomUUID());
 const pending=useRef<{signature:string;id:string}|null>(null);
 const requestId=(signature:string)=>{if(pending.current?.signature!==signature)pending.current={signature,id:crypto.randomUUID()};return pending.current.id;};
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}};
 const load=async(s:Session)=>{setSession(s);setDraft(structuredClone(s.payload));setSelected(null);setNote('');const [history,people]=await Promise.all([sessionHistory(s.id),participants(s.id)]);setEvents(history);setMembers(people);const p=new URLSearchParams(location.search);p.set('session',s.id);window.history.replaceState(null,'','?'+p);setStatus('Shared version '+s.version+' received. Reconfirm time-sensitive conditions.');};
 useEffect(()=>{void run(async()=>{const rows=await listSessions(pkg.facility.id,assetId);setSessions(rows);const target=rows.find(s=>s.id===requested);if(target)await load(target);});},[pkg.facility.id,assetId]);
 useEffect(()=>{const t=setInterval(()=>setClock(Date.now()),30000);return()=>clearInterval(t);},[]);
 const write=async(action:string,payload:Session['payload'])=>{
  if(!session)throw Error('Open a session first.');
  const saved=await saveSession(session.id,pkg.facility.id,assetId,session.version,action,payload,requestId(JSON.stringify([session.id,session.version,action,payload])));
  await load(saved);setSessions(old=>[saved,...old.filter(s=>s.id!==saved.id)]);
 };
 const editable=Boolean(session&&user&&(session.created_by===user.id||user.role==='admin'||members.some(m=>m.user_id===user.id&&m.accepted_at)));
 const patch=(p:Partial<Session['payload']>)=>setDraft(d=>d?{...d,...p}:d);
 const path=symptoms.find(s=>s.id===draft?.symptom)?.path??[];
 const current=selected??(draft?unresolvedCheck(draft,clock):null),check=current?checks[current]:null;
 const answer=check&&draft?currentAnswer(draft,check.id,clock):undefined;
 const exportSession=()=>{if(!session)return;const blob=new Blob([printable(session,events)],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='troubleshooting-'+session.id+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return <section className="troubleshooting" data-testid="troubleshooting-workspace">
  <h2>Why won’t it run?</h2><p className="slate-status">{DRAFT}</p>
  <p>Observe from normal operating positions with guards closed. Entry, electrical access or stored-energy exposure requires qualified maintenance under applicable site procedures.</p>
  <p role="status">Live telemetry: missing. This app has no PLC connection. Saved logic and recorded observations are shown separately.</p>
  {error&&<p role="alert" className="slate-error">{error}</p>}{status&&<p role="status">{status}</p>}
  {!session?<>
   <h3>Start with what you know</h3>
   <label>What stopped working?<select value={symptom} onChange={e=>setSymptom(e.target.value)}>{symptoms.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
   {Object.entries(intakeFields).map(([key,label])=><label key={key}>{label}{key==='role'?<select value={intake.role} onChange={e=>setIntake({...intake,role:e.target.value})}><option value="operator">Line operator</option><option value="maintenance">Maintenance technician</option><option value="relief">Shift relief</option><option value="Unknown">Unknown</option></select>:<input value={intake[key]??''} placeholder="Unknown" onChange={e=>setIntake({...intake,[key]:e.target.value})}/>}</label>)}
   <button disabled={busy||!user} className="slate-primary" onClick={()=>void run(async()=>{const payload=initialPayload(symptom,Object.fromEntries(Object.keys(intakeFields).map(k=>[k,intake[k]?.trim()||'Unknown'])));const s=await saveSession(createId,pkg.facility.id,assetId,0,'create',payload,requestId(JSON.stringify([createId,payload])));await load(s);})}>Start and save shared session</button>
   <h3>Resume a shared session</h3><button disabled={busy} onClick={()=>void run(async()=>setSessions(await listSessions(pkg.facility.id,assetId)))}>Refresh sessions</button>
   {sessions.length?sessions.map(s=><button className="slate-card" key={s.id} onClick={()=>void run(()=>load(s))}>{symptoms.find(v=>v.id===s.payload.symptom)?.label} · {s.payload.outcome}<small>{new Date(s.updated_at).toLocaleString()} · {s.id}</small></button>):<p>No sessions are available to this account for this machine.</p>}
  </>:draft&&<>
   <div className="slate-actions"><button disabled={busy} onClick={()=>{setSession(null);setDraft(null);setStatus('');}}>All sessions</button><button disabled={busy} onClick={()=>void run(async()=>{const rows=await listSessions(pkg.facility.id,assetId);const latest=rows.find(s=>s.id===session.id);if(!latest)throw Error('Session is no longer accessible.');setSessions(rows);if(JSON.stringify(draft)!==JSON.stringify(session.payload)){setStatus('Unsaved form retained. Shared version: '+latest.version+'. Export or record your notes before reopening the shared session from All sessions.');return;}await load(latest);})}>Refresh shared version</button><button onClick={exportSession}>Export saved checklist / handoff</button><button onClick={()=>window.print()}>Print saved record</button></div>
   <p>Session {session.id} · shared version {session.version} · {draft.outcome}</p>
   {JSON.stringify(draft)!==JSON.stringify(session.payload)&&<p role="status">Form changes are not yet saved. Export and print use the last received shared version.</p>}
   {!editable&&<><p>This handoff is awaiting your acceptance. Acceptance records your account and time and requires fresh observations.</p><button disabled={busy} onClick={()=>void run(()=>write('accept',session.payload))}>Accept handoff</button></>}
   <div className="slate-actions">{(['checks','recovery','handoff','outcome'] as const).map(p=><button key={p} aria-pressed={panel===p} onClick={()=>{setPanel(p);setSelected(null);}}>{p==='checks'?'Guided checks':p==='recovery'?'Recovery assessment':p==='handoff'?'Shift handoff':'Record outcome'}</button>)}</div>
   <fieldset disabled={busy||!editable||draft.revision!==REVISION}>
   {panel==='checks'&&<>
    <h3>{symptoms.find(s=>s.id===draft.symptom)?.label}</h3><progress max={path.length} value={path.filter(id=>currentAnswer(draft,id,clock)?.answer==='yes').length}/><p>{path.filter(id=>currentAnswer(draft,id,clock)?.answer==='yes').length} of {path.length} checks currently answered Yes. Answers expire after 15 minutes or a reported state / shift change.</p>
    <button onClick={()=>void run(()=>write('state-change',draft))}>Machine state changed — reconfirm conditions</button>
    {check?<article className="slate-card"><h3>{check.title}</h3><p><strong>Observe:</strong> {check.observe}</p><p><strong>Where:</strong> Normal operating position; exact display and sensor locations are unverified.</p><p><strong>Normal:</strong> {check.normal}</p><p><strong>Who:</strong> Operators may observe from outside guards. Anything requiring access routes to qualified maintenance.</p>
     <PageLink page={check.component==='machine'?'machine':'component'} details={check.component==='machine'?{asset:assetId}:{asset:assetId,component:assetId+'-'+check.component}} className="slate-text-link">Affected equipment and evidence →</PageLink>
     <label>What did you observe? Include exact indication and location if known.<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Unknown is allowed. Describe what you can actually establish."/></label>
     <div className="slate-actions">{(['yes','no','unknown'] as Answer[]).map(a=><button key={a} onClick={()=>void run(async()=>{await write('answer',{...draft,answers:{...draft.answers,[check.id]:{answer:a,note:note.trim()||'Unknown',author:user!.id,at:new Date().toISOString(),epoch:draft.epoch}}});setNote('');})}>{labelAnswer[a]}</button>)}</div>
     {answer&&<p><strong>{labelAnswer[answer.answer]}:</strong> {check[answer.answer]} Recorded by {answer.author} at {new Date(answer.at).toLocaleString()}. {answer.note}</p>}
     {answer&&answer.answer!=='yes'&&<button onClick={()=>{patch({nextAction:'Maintenance: verify '+check.title,outcome:'escalated'});setPanel('outcome');}}>Prepare maintenance escalation</button>}
     <details><summary>Maintenance: saved PLC evidence</summary><p>Inferred control dependency. Source SHA-256: {evidence.acd.sha256}. Extraction record numbers are not verified rungs; ownership and execution order remain unverified.</p>{evidence.records.filter(r=>check.records.includes(r.record)).map(r=><div key={r.record}><strong>Extraction record {r.record}</strong><pre>{r.text}</pre></div>)}</details>
     <button disabled={path.indexOf(check.id)<=0} onClick={()=>{setSelected(path[path.indexOf(check.id)-1]);setNote('');}}>Back</button>{selected&&<button onClick={()=>setSelected(null)}>Resume first unresolved check</button>}
    </article>:<article className="slate-card"><h3>Observations recorded</h3><p>All checks answered Yes does not establish the cause or prove safe restart. Assess recovery, record an unresolved issue, or verify the outcome under the approved site procedure.</p><button onClick={()=>setPanel('outcome')}>Record outcome</button></article>}
   </>}
   {panel==='recovery'&&<>
    <h3>Recovery is a separate decision</h3><label>Action being considered<select value={draft.recoveryKind} onChange={e=>patch({recoveryKind:e.target.value})}>{Object.entries(recoveryKinds).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    <p>{recoveryExplanations[draft.recoveryKind as keyof typeof recoveryExplanations]}</p><p className="slate-status">{recoveryStatus(draft.recovery)}</p>
    {Object.entries(recoveryFields).map(([k,v])=><label key={k}>{v}<textarea value={draft.recovery[k]??''} placeholder="Unknown" onChange={e=>patch({recovery:{...draft.recovery,[k]:e.target.value}})}/></label>)}
    <p>No approved procedure is registered for this condition. An entered procedure name is an observation and cannot validate a procedure. Stop and escalate before movement, reset or power cycling.</p>
    <p>Vertical gravity, held bottles, stored air and brake/rod-lock behavior must be assessed under approved support and restraint procedures. Removing or restoring energy may allow movement.</p>
    <button onClick={()=>void run(()=>write('assessment',draft))}>Save assessment</button>
   </>}
   {panel==='handoff'&&<>
    <h3>Leave the next shift a clear record</h3>
    <label>Actions already taken and whether they helped<textarea value={draft.actions} onChange={e=>patch({actions:e.target.value})}/></label>
    <label>Reported equipment / isolation status<textarea value={draft.isolation} onChange={e=>patch({isolation:e.target.value})}/></label><p>This is a handoff observation, not a substitute for the site’s LOTO process.</p>
    <label>Unresolved conditions and next action<textarea value={draft.nextAction} onChange={e=>patch({nextAction:e.target.value})}/></label><label>Responsible person<input value={draft.responsible} onChange={e=>patch({responsible:e.target.value})}/></label>
    <label>Related repair / work record ID (optional)<input value={draft.workId} onChange={e=>patch({workId:e.target.value})}/></label>
    {draft.workId&&<PageLink page="repair" details={{asset:assetId,work:draft.workId}}>Open related repair →</PageLink>}
    <button onClick={()=>void run(()=>write('handoff',draft))}>Save handoff</button>
    {(session.created_by===user?.id||user?.role==='admin')&&<><label>Relief’s confirmed account email<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><button onClick={()=>void run(async()=>{await inviteParticipant(session.id,email);setMembers(await participants(session.id));setStatus('Participant access saved. Share this session URL with relief; no email was sent.');})}>Grant this account session access</button></>}
    <h4>Handoff participants</h4>{members.map(m=><p key={m.user_id}>{m.user_id} · invited {new Date(m.invited_at).toLocaleString()} · {m.accepted_at?'accepted '+new Date(m.accepted_at).toLocaleString():'awaiting acceptance'}</p>)}
   </>}
   {panel==='outcome'&&<>
    <h3>What is the actual outcome?</h3><p>A cleared fault or homed bit does not prove restarting is safe. This records observed results of an approved site procedure; it does not authorize restart.</p>
    <label>Outcome<select value={draft.outcome} onChange={e=>patch({outcome:e.target.value as Session['payload']['outcome']})}><option value="unresolved">Issue remains unresolved</option><option value="escalated">Maintenance escalation required</option><option value="restored">Operation restored and verified</option></select></label>
    {draft.outcome==='restored'&&Object.entries(restartFields).map(([k,v])=><label key={k}>{v}<select value={draft.restart[k]??'unknown'} onChange={e=>patch({restart:{...draft.restart,[k]:e.target.value}})}>{Object.entries(labelAnswer).map(([a,l])=><option key={a} value={a}>{l}</option>)}</select></label>)}
    <label>Findings, actions and observed result<textarea value={draft.actions} onChange={e=>patch({actions:e.target.value})}/></label><label>Next action / unresolved conditions<textarea value={draft.nextAction} onChange={e=>patch({nextAction:e.target.value})}/></label>
    <button disabled={draft.outcome==='restored'&&!canRestore(draft)} onClick={()=>void run(()=>write('outcome',draft))}>Save observed outcome</button>
   </>}
   </fieldset>
   <details><summary>Original context, observations and audit history</summary><pre>{printable(session,events)}</pre></details>
   <pre className="troubleshooting-print">{printable(session,events)}</pre>
  </>}
  <details><summary>Source revision and missing validation</summary><p>{REVISION} · ACD SHA-256 {evidence.acd.sha256}</p><p>Native L5X/L5K, installed-project match, HMI labels, physical labels, drawings, manufacturer applicability and approved site procedures are missing. ACD import provides no current machine state.</p><PageLink page="machine" details={{asset:assetId,section:'manuals'}}>Open source review and evidence →</PageLink></details>
 </section>;
}
