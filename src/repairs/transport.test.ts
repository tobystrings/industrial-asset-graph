import {beforeEach,expect,it,vi} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
const api=vi.hoisted(()=>({rpc:vi.fn(),upload:vi.fn(),download:vi.fn()}));
vi.mock('../facility/supabaseAuth',()=>({supabase:{rpc:api.rpc,storage:{from:()=>({upload:api.upload,download:api.download})}}}));
import {syncWork,submitWork} from './transport';
import {editedWork,newWork} from './model';
import {putWorkFile,readWork,updateWork} from './store';
import {sha256} from '../facility/additivePackage';
beforeEach(()=>{globalThis.indexedDB=new IDBFactory();globalThis.dispatchEvent=()=>true;api.rpc.mockReset();api.upload.mockReset();api.download.mockReset();});
it('retains edits typed while an older version is uploading',async()=>{
 const w=newWork('plant','operator','Operator');w.note='First';await updateWork('plant',w.id,()=>w);
 let release!:(value:unknown)=>void;let started!:()=>void;const entered=new Promise<void>(r=>started=r);
 api.rpc.mockImplementation(()=>{started();return new Promise(r=>release=r);});
 const upload=syncWork(w);await entered;
 await updateWork('plant',w.id,old=>editedWork(old!,{note:'Second'}));
 release({data:{status:'saved',version:1},error:null});await upload;
 const [current]=await readWork('plant');expect(current.note).toBe('Second');expect(current.transport).toBe('local');expect(current.sharedVersion).toBe(1);
});
it('retries a lost response with the same original and request identifier',async()=>{
 const w=newWork('plant','operator','Operator');const file=new Blob(['immutable original']);
 w.files=[{id:'file',name:'photo.txt',type:'text/plain',size:file.size,sha256:await sha256(file)}];
 await putWorkFile('plant','file',file);await updateWork('plant',w.id,()=>w);
 api.download.mockResolvedValue({data:file,error:null});
 api.upload.mockResolvedValueOnce({error:null}).mockResolvedValueOnce({error:{message:'The resource already exists'}});
 api.rpc.mockResolvedValueOnce({error:{message:'Response interrupted'}}).mockResolvedValueOnce({data:{status:'duplicate',version:1},error:null});
 await expect(syncWork(w)).rejects.toThrow('Response interrupted');
 expect((await readWork('plant'))[0].transport).toBe('pending');
 await syncWork(w);expect((await readWork('plant'))[0].transport).toBe('received');
 expect(api.rpc.mock.calls[0][1]).toEqual(api.rpc.mock.calls[1][1]);
 expect(api.upload.mock.calls[0][0]).toBe(api.upload.mock.calls[1][0]);
});
it('never submits a conflicting local version or reports it received',async()=>{
 const w=newWork('plant','operator','Operator');w.note='Phone version';await updateWork('plant',w.id,()=>w);
 api.rpc.mockResolvedValue({data:{status:'conflict',version:3},error:null});
 await expect(submitWork(w)).rejects.toThrow('synchronizing');
 const [current]=await readWork('plant');expect(current.note).toBe('Phone version');expect(current.transport).toBe('conflict');
 expect(api.rpc.mock.calls.every(c=>c[0]==='iag_work_save')).toBe(true);
});
