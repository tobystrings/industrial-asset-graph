import { useEffect, useRef, useState } from 'react';
import type { FacilityMapSymbol, StudioLayer } from '../facility/types';
import type { MapEditorSession } from './MapAreaEditor';
import { allObjects, applyActions, changeStudio, layerNames, layerOf, layerState, objectLabel, symbolKinds, uid, type StudioAction } from './studioModel';
import { parseCommands } from './studioCommands';
import { mapChangeSummary, type MapEditorDraft } from './mapEditor';
import { SymbolDrawing } from './StudioSymbols';
import { supabase } from '../facility/supabaseAuth';
import './mapStudio.css';

const apiUrl=(import.meta.env.VITE_IAG_API_URL??'').replace(/\/$/,'');
export function MapStudioPanel({session:s}:{session:MapEditorSession}) {
  const [tab,setTab]=useState<string | null>('Text edits'),[input,setInput]=useState(''),[reply,setReply]=useState('Select an object or use an exact room name. Preview an edit before applying it.');
  const [busy,setBusy]=useState(false),[useAI,setUseAI]=useState(false),[query,setQuery]=useState('');
  const [preview,setPreview]=useState<{base:string;draft:MapEditorDraft;summary:string[]}|null>(null);
  const requestId=useRef(0);
  const [connection,setConnection]=useState<'missing'|'checking'|'ready'|'unavailable'>(apiUrl?'checking':'missing');
  const [connectionMessage,setConnectionMessage]=useState('This build has no AI server address.');
  const checkConnection=async()=>{
    if(!apiUrl) {setConnection('missing');return;}
    setConnection('checking');
    try {
      const token=(await supabase?.auth.getSession())?.data.session?.access_token;
      if(!token) throw new Error('Sign in with an administrator account to check AI access.');
      const response=await fetch(apiUrl+'/api/map-studio/status',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)});
      if(!response.ok) throw new Error(response.status===404?'The server needs the Map Studio connection update.':response.status===403?'This account does not have administrator access.':'The AI server could not be reached or your session expired.');
      const status=await response.json();
      setConnection(status.configured===true?'ready':'unavailable');
      setConnectionMessage(status.configured===true?'Server configuration and administrator access checked. Preview an edit to test the AI provider.':'The server is reachable, but its AI key or model is missing.');
    } catch(e) {setConnection('unavailable');setConnectionMessage((e as Error).message);}
  };
  useEffect(()=>{void checkConnection();},[]);
  const panelRef=useRef<HTMLElement>(null);
  useEffect(()=>{
    const focus=()=>{setTab('Text edits');requestAnimationFrame(()=>{panelRef.current?.scrollIntoView({block:'start',behavior:'smooth'});panelRef.current?.querySelector('textarea')?.focus({preventScroll:true});});};
    window.addEventListener('iag-map-assistant',focus);
    return()=>window.removeEventListener('iag-map-assistant',focus);
  },[]);
  const d=s.history.present, studio=d.mapConfig.studio??{}, selected=s.selection[0];
  const symbol=selected?.kind==='symbol'?studio.symbols?.find(x=>x.id===selected.id):undefined;
  const mask=selected?.kind==='mask'?studio.masks?.find(x=>x.id===selected.id):undefined;
  const wall=selected?.kind==='wall'?d.mapConfig.walls?.find(x=>x.id===selected.id):undefined;
  const box=symbol??mask;
  const base=JSON.stringify(d);
  const stale=Boolean(preview&&preview.base!==base);
  useEffect(()=>{ if(stale) s.setPreviewDraft(null); },[stale]);
  useEffect(()=>()=>{requestId.current++;},[]);
  const patch=(value:Parameters<typeof changeStudio>[1],message:string)=>s.commit(changeStudio(d,value),message);
  const patchSymbol=(value:Partial<FacilityMapSymbol>)=>{
    if(!symbol||layerState(d.mapConfig,'symbols').locked) return;
    const next=changeStudio(d,{symbols:studio.symbols?.map(x=>x.id===symbol.id?{...x,...value}:x)});
    try { const checked=applyActions(next,[{op:'move',targets:[selected],dx:0,dy:0}],s.facility); s.commit(checked,'Updated symbol properties.'); } catch(e) {s.setMessage((e as Error).message);}
  };
  const runPreview=async()=>{
    const id=++requestId.current;
    setBusy(true);s.setPreviewDraft(null);setPreview(null);
    try {
      let actions:StudioAction[];
      if(useAI) {
        const token=(await supabase?.auth.getSession())?.data.session?.access_token;
        if(!apiUrl||!token) throw new Error('Connected AI needs the shared API and a signed-in session. Supported text commands work without AI.');
        const response=await fetch(apiUrl+'/api/map-studio/plan',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({instruction:input,selection:s.selection,objects:allObjects(d).map(r=>({...r,name:objectLabel(d,r)}))}),signal:AbortSignal.timeout(45000)});
        const plan=await response.json();
        if(!response.ok) throw new Error(plan.error??'AI planning is unavailable.');
        if(plan.clarification) throw new Error(plan.clarification);
        actions=plan.actions;
      } else actions=parseCommands(input,d,s.selection);
      const next=applyActions(d,actions,s.facility);
      if(id!==requestId.current) return;
      const summary=actions.map(a=>`${a.op}: ${a.targets.map(r=>objectLabel(d,r)).join(', ')}${a.op==='rename'||a.op==='merge'?' → '+a.name:a.op==='move'?` (${a.dx}, ${a.dy} map units)`:a.op==='rotate'?` (${a.angle}°)`:a.op==='resize'?` (${a.width} × ${a.height} map units)`:''}`);
      setPreview({base,draft:next,summary});s.setPreviewDraft(next);setReply('Preview only. Your saved map has not changed. Edit the instruction and preview again to refine it.');
    } catch(e) {if(id===requestId.current) setReply((e as Error).message);} finally {if(id===requestId.current) setBusy(false);}
  };
  const exportDraft=()=>{
    const blob=new Blob([JSON.stringify({format:'iag-map-studio-draft',version:1,facilityId:s.facility.facility.id,draft:d},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='map-studio-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const customFromSelection=()=>{
    const lines=d.mapConfig.annotations?.filter(a=>s.selection.some(r=>r.kind==='annotation'&&r.id===a.id)&&'points' in a)??[];
    const paths=lines.flatMap(a=>'points' in a?[a.points]:[]),points=paths.flat();
    if(points.length<2) {s.setMessage('Select freehand strokes or markup lines to save a custom symbol.');return;}
    const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y)),width=Math.max(.5,Math.max(...points.map(p=>p.x))-x),height=Math.max(.5,Math.max(...points.map(p=>p.y))-y);
    const label=window.prompt('Name this reusable symbol');if(!label?.trim()) return;
    const template:FacilityMapSymbol={id:uid('template'),kind:'custom',label:label.trim(),x:0,y:0,width,height,rotation:0,paths:paths.map(path=>path.map(p=>({x:(p.x-x)/width*100,y:(p.y-y)/height*100})))};
    patch({templates:[...(studio.templates??[]),template]},'Saved custom symbol template.');s.setTemplate(template);s.setSymbolKind('custom');
  };
  return <aside ref={panelRef} className="map-studio-panel" aria-label="Map Studio assistant and properties">
    <div className="studio-tabs" role="tablist" aria-label="Studio panels">{['Text edits','Objects','Layers'].map(t=><button key={t} role="tab" aria-selected={tab===t} aria-expanded={tab===t} onClick={()=>setTab(tab===t?null:t)}>{t}</button>)}</div>
    {tab==='Text edits'&&<section className="studio-tab-body" aria-label="Text edits">
      <div className="studio-connection" data-state={connection} role="status"><b>{connection==='ready'?'AI server ready':connection==='checking'?'Checking AI connection…':'AI not connected'}</b><p>{connectionMessage}</p><button onClick={()=>void checkConnection()} disabled={!apiUrl||connection==='checking'}>Check connection</button>{connection!=='ready'&&<details><summary>Connection setup</summary><p>An administrator must deploy the authenticated map API, set its server-only OPENAI_API_KEY and IAG_MAP_AI_MODEL, and set the GitHub repository variable VITE_IAG_API_URL to that HTTPS server address. Rebuild Pages afterward. Never paste an API key into this editor.</p></details>}</div>
      <h3>Describe your edit</h3><p>Click or multi-select objects, then refer to “this” or “these”.</p>
      <div className="studio-selection-context">{s.selection.length?s.selection.map(r=>objectLabel(d,r)).join(' · '):'Nothing selected — exact room names also work.'}</div>
      <label>Edit instructions<textarea aria-label="Edit instructions" rows={5} value={input} onChange={e=>{setInput(e.target.value);requestId.current++;setBusy(false);setPreview(null);s.setPreviewDraft(null);}} placeholder="Rename this to Main Cooler"/></label>
      <div className="studio-examples">{['Move this left 1','Flip this','Rotate this 90','Delete this'].map(t=><button key={t} onClick={()=>{requestId.current++;setBusy(false);setInput(t);setPreview(null);s.setPreviewDraft(null);}}>{t}</button>)}</div>
      <label className="studio-check"><input type="checkbox" checked={useAI} disabled={connection!=='ready'} onChange={e=>{requestId.current++;setBusy(false);setPreview(null);s.setPreviewDraft(null);setUseAI(e.target.checked);}}/>Use connected AI</label>
      <small>{useAI?'Freeform AI proposes edits for your review.':'Using offline commands. This is not freeform AI.'} Movement and sizes use percentages of the drawing, not surveyed feet.</small>
      <button className="studio-primary" disabled={busy||!input.trim()||s.saving} onClick={()=>void runPreview()}>{busy?'Preparing preview…':'Preview edit'}</button>
      <p role="status" className="studio-reply">{stale?'The draft changed. Preview again before applying.':reply}</p>
      {preview&&<div className="studio-proposal"><b>Proposed changes</b><ul>{preview.summary.map((t,i)=><li key={i}>{t}</li>)}</ul><button className="studio-primary" disabled={stale||s.saving} onClick={()=>{if(preview.base!==JSON.stringify(s.history.present)) return;s.commit(preview.draft,'Applied text edit. Undo is available.');setPreview(null);s.setPreviewDraft(null);setReply('Applied to your draft. Save Changes to keep it.');}}>Apply preview</button><button onClick={()=>{setPreview(null);s.setPreviewDraft(null);}}>Discard preview</button></div>}
      <details><summary>Supported text edits</summary><p>Rename this to Main Cooler; move this left 2; rotate this 90; flip this; resize this to 3 by 5; duplicate this; delete this; merge these rooms into Main Cooler.</p><p>Separate multiple commands with semicolons. Unknown requests make no changes.</p></details>
    </section>}
    {tab==='Objects'&&<section className="studio-tab-body" aria-label="Studio objects">
      <h3>Symbols</h3><div className="studio-symbol-palette">{symbolKinds.filter(k=>k!=='custom').map(kind=><button key={kind} aria-label={`Choose ${kind}`} aria-pressed={s.symbolKind===kind&&!s.template} onClick={()=>{s.setSymbolKind(kind);s.setTemplate(null);}}><svg viewBox="0 0 100 100"><SymbolDrawing symbol={{id:kind,kind,label:kind,x:0,y:0,width:3,height:4,rotation:0}}/></svg><span>{kind.replaceAll('-',' ')}</span></button>)}</div>
      <div className="studio-actions"><button onClick={()=>s.selectTool('symbol')} aria-pressed={s.tool==='symbol'}>Draw new symbol</button><button onClick={()=>s.selectTool('replace-symbol')} aria-pressed={s.tool==='replace-symbol'}>Replace reference symbol</button><button onClick={()=>s.selectTool('mask')}>Hide reference feature</button></div>
      <p>Choose a symbol, then drag a box on the drawing. Replace hides the original pixels and adds an editable symbol. Cleanup remains when the symbol moves or is deleted.</p>
      {studio.templates?.length ? <label>Custom symbols<select aria-label="Custom symbols" value={s.template?.id??''} onChange={e=>{s.setTemplate(studio.templates!.find(t=>t.id===e.target.value)??null);s.setSymbolKind('custom');}}><option value="">Choose a template</option>{studio.templates.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>:null}
      <button onClick={customFromSelection}>Save selected strokes as symbol</button>
      <h3>Selected object</h3>
      {selected?<><p>{objectLabel(d,selected)} <small>({selected.kind})</small></p><div className="studio-actions"><button onClick={()=>s.act([{op:'duplicate',targets:s.selection}],'Duplicated selection.')}>Duplicate</button><button onClick={()=>s.act([{op:'delete',targets:s.selection}],'Removed map selection; equipment records retained.')}>Delete selection</button></div></>:<p>Select an object on the drawing or in the list below.</p>}
      {symbol&&<><label>Symbol name<input value={symbol.label} onChange={e=>patchSymbol({label:e.target.value})}/></label><label>Symbol type<select aria-label="Symbol type" value={symbol.kind} onChange={e=>patchSymbol({kind:e.target.value as FacilityMapSymbol['kind']})}>{symbolKinds.map(k=><option key={k}>{k}</option>)}</select></label><label>Rotation (degrees)<input type="number" value={symbol.rotation} onChange={e=>patchSymbol({rotation:Number(e.target.value)})}/></label><button onClick={()=>patchSymbol({flipped:!symbol.flipped})}>Flip swing / orientation</button>{symbol.kind==='stairs'&&<><label>Step count<input type="number" min="2" max="30" value={symbol.steps??7} onChange={e=>patchSymbol({steps:Number(e.target.value)})}/></label><label>Stair direction<select aria-label="Stair direction" value={symbol.direction??'up'} onChange={e=>patchSymbol({direction:e.target.value as 'up'|'down'})}><option value="up">Up</option><option value="down">Down</option></select></label></>}</>}
      {box&&<div className="studio-dimensions">{(['x','y','width','height'] as const).map(key=><label key={key}>{key} (%)<input aria-label={`Object ${key}`} type="number" step="0.1" value={Number(box[key].toFixed(2))} onChange={e=>{const value=Number(e.target.value);if(symbol) patchSymbol({[key]:value});else {const next=changeStudio(d,{masks:studio.masks?.map(m=>m.id===box.id?{...m,[key]:value}:m)});try{s.commit(applyActions(next,[{op:'move',targets:[selected],dx:0,dy:0}],s.facility),'Updated reference cleanup.');}catch(e){s.setMessage((e as Error).message);}}}}/></label>)}</div>}
      {wall&&<div><h4>Wall endpoints (%)</h4>{wall.points.map((p,i)=><div className="studio-dimensions" key={i}>{(['x','y'] as const).map(axis=><label key={axis}>Point {i+1} {axis}<input type="number" min="0" max="100" step="0.5" value={p[axis]} onChange={e=>{const value=Number(e.target.value);if(!Number.isFinite(value)||value<0||value>100) return;s.commit({...d,mapConfig:{...d.mapConfig,walls:d.mapConfig.walls?.map(w=>w.id===wall.id?{...w,points:w.points.map((p,j)=>j===i?{...p,[axis]:value}:p)}:w)}},'Moved wall endpoint.');}}/></label>)}</div>)}</div>}
      <h3>Equipment tray</h3><label>Existing equipment<select aria-label="Existing equipment" value={s.equipmentId} onChange={e=>s.setEquipmentId(e.target.value)}><option value="">Choose equipment</option>{s.assets.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><button disabled={!s.equipmentId} onClick={()=>s.selectTool('place-equipment')}>Place on map</button>
      <label>Find map object<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Room, symbol or asset…"/></label><div className="studio-object-list">{allObjects(d).filter(r=>`${objectLabel(d,r)} ${r.kind}`.toLowerCase().includes(query.toLowerCase())).map(r=><button key={`${r.kind}:${r.id}`} disabled={!layerState(d.mapConfig,layerOf(r)).visible||layerState(d.mapConfig,layerOf(r)).locked} aria-pressed={s.selection.some(x=>x.id===r.id&&x.kind===r.kind)} onClick={e=>s.choose(r,e.shiftKey||s.tool==='multi-select')}><span>{objectLabel(d,r)}</span><small>{r.kind}</small></button>)}</div>
    </section>}
    {tab==='Layers'&&<section className="studio-tab-body" aria-label="Studio layers"><h3>Drawing layers</h3>{(Object.keys(layerNames) as StudioLayer[]).map(layer=>{const value=layerState(d.mapConfig,layer);return <div className="studio-layer-row" key={layer}><b>{layerNames[layer]}</b><label><input type="checkbox" aria-label={`Show ${layerNames[layer]}`} checked={value.visible} onChange={e=>patch({layers:{...studio.layers,[layer]:{...value,visible:e.target.checked}}},'Changed layer visibility.')}/>Show</label><label><input type="checkbox" aria-label={`Lock ${layerNames[layer]}`} checked={value.locked} onChange={e=>{patch({layers:{...studio.layers,[layer]:{...value,locked:e.target.checked}}},'Changed layer lock.');s.setSelection([]);}}/>Lock</label></div>})}
      <label>Reference opacity<input type="range" min="0" max="1" step="0.05" value={studio.referenceOpacity??1} onChange={e=>patch({referenceOpacity:Number(e.target.value)},'Changed reference opacity.')}/></label>
      <label>Snap spacing<select aria-label="Snap spacing" value={studio.snap??.5} onChange={e=>patch({snap:Number(e.target.value)},'Changed snapping.')}><option value="0">Off</option><option value="0.25">0.25 map units</option><option value="0.5">0.5 map units</option><option value="1">1 map unit</option><option value="2">2 map units</option></select></label>
      <p>Reference pixels are locked artwork. Replace symbols or hide features to rebuild individual portions. Hiding cleanup outlines does not reveal removed source pixels.</p>
    </section>}
    {tab&&<details className="studio-draft-history"><summary>Draft & recovery</summary><p>{s.history.past.length} undo steps · {s.history.future.length} redo steps</p><button onClick={exportDraft}>Export current draft</button><label>Restore draft<input type="file" accept=".json" onChange={async e=>{const file=e.target.files?.[0];if(!file) return;try {const value=JSON.parse(await file.text());if(value.format!=='iag-map-studio-draft'||value.version!==1||value.facilityId!==s.facility.facility.id) throw new Error('Choose a draft exported from this facility.');const next=value.draft as MapEditorDraft;const {loadFacilityPackage}=await import('../facility/schema');loadFacilityPackage({...s.facility,...next});s.commit(next,'Restored draft. Save Changes to keep it.');}catch(e){s.setMessage((e as Error).message);}}}/></label><ul>{mapChangeSummary({areas:s.facility.areas,mapConfig:s.facility.mapConfig??{}},d).map((t,i)=><li key={i}>{t}</li>)}</ul></details>}
  </aside>;
}
