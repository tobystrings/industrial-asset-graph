import { expect,it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import seed from './activeFacility';
import { ensurePlantSeed, openPlantDb } from './runtimeDb';
import { validateFacilityPackage } from './schema';
it('adds production source evidence with old seed recovery without changing existing equipment',async()=>{
 globalThis.indexedDB=new IDBFactory();
 const old=structuredClone(seed);delete old.facility.production?.copacking;
 const refs=new Set<string>();const visit=(v:unknown)=>{if(v&&typeof v==='object')for(const [k,c]of Object.entries(v)){if(k==='evidenceIds'&&Array.isArray(c))c.forEach(x=>refs.add(x));else visit(c);}};visit(seed.facility.production?.copacking);
 old.evidence=old.evidence.filter(e=>!refs.has(e.id));
 const db=await openPlantDb(seed.facility.id);await new Promise<void>((resolve,reject)=>{const tx=db.transaction('plant','readwrite');tx.objectStore('plant').put(old,'active');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();
 const migrated=await ensurePlantSeed(seed);expect(()=>validateFacilityPackage(migrated)).not.toThrow();expect(migrated.assets).toEqual(old.assets);expect(migrated.facility.production?.copacking).toEqual(seed.facility.production?.copacking);
 const recovery=await openPlantDb(seed.facility.id);const snapshots=await new Promise<unknown[]>((resolve,reject)=>{const r=recovery.transaction('publication-state').objectStore('publication-state').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});recovery.close();expect(snapshots.length).toBeGreaterThan(0);
});
