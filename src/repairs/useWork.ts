import { useCallback, useEffect, useState } from 'react';
import { useFacility, useFacilityEditor } from '../facility';
import { readWork, updateWork } from './store';
import { receiveWork, syncWork, workConnected } from './transport';
import type { WorkRecord } from './model';

export function useWorkRecords(){
  const pkg=useFacility(),editor=useFacilityEditor();const [records,setRecords]=useState<WorkRecord[]>([]),[error,setError]=useState('');
  const refresh=useCallback(async()=>{try{const rows=await readWork(pkg.facility.id);setRecords(rows.filter(w=>w.authorId===editor.currentUser?.id).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));}catch(e){setError(String(e));}},[pkg.facility.id,editor.currentUser?.id]);
  useEffect(()=>{void refresh();const listener=()=>void refresh();addEventListener('iag-work-changed',listener);return()=>removeEventListener('iag-work-changed',listener);},[refresh]);
  return {records,error,refresh};
}
/** Mounted above routes so leaving a repair never cancels its queued saves/uploads. */
export function WorkSync(){
  const pkg=useFacility(),editor=useFacilityEditor();
  useEffect(()=>{
    if(!editor.ready||!editor.currentUser||!workConnected())return;
    let timer:ReturnType<typeof setTimeout>|undefined,active=true;
    const run=async()=>{if(!navigator.onLine)return;const rows=await readWork(pkg.facility.id);for(const row of rows.filter(w=>w.authorId===editor.currentUser!.id&&['local','pending'].includes(w.transport)&&!w.error&&(w.note||w.entries.length||w.files.length))){if(!active)break;await syncWork(row).catch(()=>undefined);}};
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>void run().catch(()=>undefined),1400);};
    const online=()=>{void (async()=>{await receiveWork(pkg.facility.id,editor.currentUser!.id);const records=await readWork(pkg.facility.id);for(const w of records.filter(w=>w.authorId===editor.currentUser!.id&&w.transport==='pending'&&w.error))await updateWork(pkg.facility.id,w.id,old=>({...old!,error:undefined}));schedule();})().catch(()=>schedule());};
    online();const interval=setInterval(()=>void run().catch(()=>undefined),30000);addEventListener('iag-work-changed',schedule);addEventListener('online',online);
    return()=>{active=false;clearTimeout(timer);clearInterval(interval);removeEventListener('iag-work-changed',schedule);removeEventListener('online',online);};
  },[pkg.facility.id,editor.ready,editor.currentUser?.id]);return null;
}
