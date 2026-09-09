import { useCallback, useEffect, useRef, useState } from 'react';
import type { FacilityPackage } from './types';
import type { IagUser } from './changeControl';
import { listQueuedMutations, replaceQueuedMutations, loadPlant, openPlantDb } from './runtimeDb';
import { applyPublication, canonicalJson, capturePublication, emptyPublication, initialPublicationBase, mergePublication, publicationEnabled, publishPublication, readPublication, submitPublication, type Publication, type PublicationConflict, type PublishedAttachment } from './publication';

export interface PublicationStatus {
  phase: 'DISABLED'|'CHECKING'|'SAVED'|'SAVING'|'CONFLICT'|'ERROR'|'REVIEW';
  revision: number; message: string; conflicts: PublicationConflict[];
}
interface Checkpoint { id: 'shared'; revision: number; payload: Publication }
async function checkpoint(facilityId: string, value?: Checkpoint): Promise<Checkpoint | undefined> {
  const db=await openPlantDb(facilityId);
  try { return await new Promise((resolve,reject)=>{const tx=db.transaction('publication-state',value?'readwrite':'readonly');const store=tx.objectStore('publication-state');const r=value?store.put(value):store.get('shared');tx.oncomplete=()=>resolve(value??r.result);tx.onerror=()=>reject(tx.error);}); } finally {db.close();}
}

export function usePublicationSync(ready: boolean, seed: FacilityPackage, user: IagUser | null, onApply: (p:FacilityPackage)=>void) {
  const enabled=publicationEnabled && seed.facility.id==='facility-j-lieb';
  const originalSeed=useRef(structuredClone(seed));
  const [state,setState]=useState<PublicationStatus>({phase:enabled?'CHECKING':'DISABLED',revision:0,message:enabled?'Checking shared plant data…':'Saved on this device.',conflicts:[]});
  const running=useRef(false);const base=useRef<Checkpoint | undefined>(undefined);const uploaded=useRef(new Map<string,PublishedAttachment>());
  const failed=useRef<{payload:Publication;revision:number;remote:Publication} | undefined>(undefined);
  const applyRef=useRef(onApply);applyRef.current=onApply;
  const syncNow=useCallback(async ():Promise<boolean>=>{
    if (!enabled || !ready || !user) return !enabled;
    if (running.current) return false;
    running.current=true;
    try {
      setState(s=>({...s,phase:'SAVING',message:'Saving shared plant data…'}));
      const remote=await readPublication(seed.facility.id);
      if (!base.current) base.current=await checkpoint(seed.facility.id);
      for (const a of remote?.payload.attachments??[]) uploaded.current.set(`${a.id}:${a.sha256}`,a);
      const plant=await loadPlant(seed.facility.id);if(!plant) throw new Error('Plant is not loaded yet.');
      const local=await capturePublication(plant,uploaded.current);
      const deletedIds=new Set((await listQueuedMutations(seed.facility.id)).filter(m=>m.operation==='DELETE').map(m=>m.entityId));
      const baseline=base.current?.payload??initialPublicationBase(emptyPublication(originalSeed.current),local,deletedIds);
      if(user.role!=='admin') {
        // Public proposal storage is separate from canonical authority.
        await submitPublication(local,user.id);
        if(remote) {
          const merged=mergePublication(baseline,local,remote.payload);
          if(!merged.conflicts.length && canonicalJson(merged.payload)!==canonicalJson(local)) {await applyPublication(merged.payload);applyRef.current(merged.payload.plant);}
          base.current={id:'shared',revision:remote.revision,payload:remote.payload};await checkpoint(seed.facility.id,base.current);
        }
        setState({phase:'REVIEW',revision:remote?.revision??0,message:'Proposed work is saved publicly. Canonical changes await administrator review.',conflicts:[]});return true;
      }
      let payload=local;
      if(remote) {
        const merged=mergePublication(baseline,local,remote.payload);
        if(merged.conflicts.length) {
          failed.current={payload:merged.payload,revision:remote.revision,remote:remote.payload};
          setState({phase:'CONFLICT',revision:remote.revision,message:'Concurrent edits need review. Both versions are preserved.',conflicts:merged.conflicts});return false;
        }
        payload=merged.payload;
        if(!base.current) payload.plant.areas=payload.plant.areas.map(area=>({...area,assetIds:[...new Set([...area.assetIds,...payload.plant.assets.filter(a=>a.areaId===area.id).map(a=>a.id)])]}));
      }
      let revision=remote?.revision??0;
      if(!remote || canonicalJson(payload)!==canonicalJson(remote.payload)) {
        const result=await publishPublication(payload,revision,crypto.randomUUID());
        if(result.status==='conflict') {setState({phase:'ERROR',revision:result.revision,message:'Another device saved during publication. Retry to merge its changes.',conflicts:[]});return false;}
        revision=result.revision;
      }
      // Do not overwrite a local edit that arrived while network work was running.
      const latestPlant=await loadPlant(seed.facility.id);
      const latest=latestPlant ? await capturePublication(latestPlant,uploaded.current) : undefined;
      if(canonicalJson(latest)!==canonicalJson(local)) {
        setState({phase:'SAVED',revision,message:`Shared revision ${revision} saved; newer local edits will save next.`,conflicts:[]});return true;
      }
      if(canonicalJson(payload)!==canonicalJson(local)) {await applyPublication(payload);applyRef.current(payload.plant);}
      const queued=await listQueuedMutations(seed.facility.id);
      await replaceQueuedMutations(queued.filter(m=>m.reviewState!=='APPROVED' || (payload.plant.entityVersions[m.entityId]??0)<m.baseVersion+1),seed.facility.id);
      base.current={id:'shared',revision,payload};await checkpoint(seed.facility.id,base.current);
      failed.current=undefined;
      setState({phase:'SAVED',revision,message:`Saved across devices · revision ${revision}. GitHub publication runs automatically.`,conflicts:[]});return true;
    } catch(error) {setState(s=>({...s,phase:'ERROR',message:`Saved locally; shared save needs attention: ${error instanceof Error?error.message:String(error)}`}));return false;}
    finally{running.current=false;}
  },[enabled,ready,seed.facility.id,user?.id,user?.role]);

  const resolve=useCallback(async (choice:'local'|'shared')=>{
    const f=failed.current;if(!f || running.current) return;
    // A deliberate whole-publication resolution keeps both complete snapshots in the database's revision history.
    const payload=choice==='local'?f.payload:f.remote;
    if(choice==='local') {const result=await publishPublication(payload,f.revision,crypto.randomUUID());if(result.status==='conflict'){await syncNow();return;}f.revision=result.revision;}
    await applyPublication(payload);applyRef.current(payload.plant);
    base.current={id:'shared',revision:f.revision,payload};await checkpoint(seed.facility.id,base.current);failed.current=undefined;
    setState({phase:'SAVED',revision:f.revision,message:`Conflict resolved · shared revision ${f.revision}.`,conflicts:[]});
  },[seed.facility.id,syncNow]);

  useEffect(()=>{
    if(!enabled || !ready || !user) return;
    void syncNow();const timer=setInterval(()=>{if(!failed.current)void syncNow();},30000);
    const online=()=>void syncNow();addEventListener('online',online);
    return()=>{clearInterval(timer);removeEventListener('online',online);};
  },[enabled,ready,syncNow,user?.id]);
  return {state,syncNow,resolve};
}
