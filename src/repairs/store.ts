import { openPlantDb } from '../facility/runtimeDb';
import { assertWork, type WorkRecord } from './model';

const queues=new Map<string,Promise<unknown>>();
const changed=()=>dispatchEvent(new Event('iag-work-changed'));
export async function readWork(facilityId:string):Promise<WorkRecord[]> {
  const db=await openPlantDb(facilityId);
  try{return await new Promise((resolve,reject)=>{const r=db.transaction('work-records').objectStore('work-records').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}
}
/** Serial writes prevent a slow keystroke/acknowledgement from replacing newer work. */
export function updateWork(facilityId:string,id:string,update:(old:WorkRecord|undefined)=>WorkRecord):Promise<WorkRecord> {
  const key=facilityId+':'+id;
  const run=(queues.get(key)??Promise.resolve()).catch(()=>undefined).then(async()=>{
    const db=await openPlantDb(facilityId);
    try{return await new Promise<WorkRecord>((resolve,reject)=>{
      const tx=db.transaction('work-records','readwrite'),store=tx.objectStore('work-records');let next:WorkRecord;
      const r=store.get(id);r.onsuccess=()=>{try{next=update(r.result);assertWork(next,facilityId);store.put(next);}catch(e){tx.abort();reject(e);}};
      tx.oncomplete=()=>{changed();resolve(next);};tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('Unable to save work on this phone.'));
    });}finally{db.close();}
  });queues.set(key,run);void run.finally(()=>{if(queues.get(key)===run)queues.delete(key);}).catch(()=>undefined);return run;
}
export async function putWorkFile(facilityId:string,id:string,blob:Blob) {
  const db=await openPlantDb(facilityId);try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('work-files','readwrite');tx.objectStore('work-files').put({id,blob});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}finally{db.close();}
}
export async function getWorkFile(facilityId:string,id:string):Promise<Blob|undefined> {
  const db=await openPlantDb(facilityId);try{return await new Promise((resolve,reject)=>{const r=db.transaction('work-files').objectStore('work-files').get(id);r.onsuccess=()=>resolve(r.result?.blob);r.onerror=()=>reject(r.error);});}finally{db.close();}
}
